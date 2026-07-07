import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require CRON_SECRET header to prevent unauthenticated invocation
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const today = new Date();
    // Report for previous month
    const reportMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const monthStart = reportMonth.toISOString().split("T")[0];
    const monthEnd = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const monthLabel = reportMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Get all landlords (users with properties)
    const { data: properties } = await supabase
      .from("properties")
      .select("id, name, user_id, total_units");

    // Group by user
    const userProperties: Record<string, any[]> = {};
    for (const prop of properties || []) {
      if (!userProperties[prop.user_id]) userProperties[prop.user_id] = [];
      userProperties[prop.user_id].push(prop);
    }

    let reportsSent = 0;

    for (const [userId, props] of Object.entries(userProperties)) {
      const propertyIds = props.map((p: any) => p.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name, business_name, phone")
        .eq("user_id", userId)
        .single();

      if (!profile?.email) continue;

      // ---- Revenue (rent payments) ----
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("payment_date", monthStart)
        .lt("payment_date", monthEnd);
      const totalRevenue = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);

      // ---- Utility income (garbage, water, etc.) ----
      const monthKey = monthStart.slice(0, 7); // YYYY-MM
      const { data: utilPaid } = await supabase
        .from("utility_bills")
        .select("utility_type, total_amount, status")
        .eq("user_id", userId)
        .eq("billing_period", monthKey);
      const utilityByType: Record<string, { paid: number; outstanding: number }> = {};
      let utilityCollected = 0;
      let utilityOutstanding = 0;
      for (const u of utilPaid || []) {
        const k = String(u.utility_type);
        utilityByType[k] ??= { paid: 0, outstanding: 0 };
        const amt = Number(u.total_amount);
        if (u.status === "paid") { utilityByType[k].paid += amt; utilityCollected += amt; }
        else { utilityByType[k].outstanding += amt; utilityOutstanding += amt; }
      }

      // ---- Expenses ----
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", userId)
        .gte("expense_date", monthStart)
        .lt("expense_date", monthEnd);
      const totalExpenses = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

      // ---- Commissions (agent + caretaker) for this landlord ----
      const { data: commissions } = await supabase
        .from("commission_ledger")
        .select("recipient_type, commission_amount, status, recipient_user_id, caretaker_id")
        .eq("landlord_user_id", userId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      const agentCommission = (commissions || [])
        .filter((c: any) => c.recipient_type === "agent")
        .reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
      const caretakerCommission = (commissions || [])
        .filter((c: any) => c.recipient_type === "caretaker")
        .reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
      const totalCommissions = agentCommission + caretakerCommission;
      const commissionsPaid = (commissions || [])
        .filter((c: any) => c.status === "paid")
        .reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
      const commissionsPending = totalCommissions - commissionsPaid;

      // Per-recipient rollup (names)
      const agentIds = Array.from(new Set((commissions || [])
        .filter((c: any) => c.recipient_type === "agent" && c.recipient_user_id)
        .map((c: any) => c.recipient_user_id)));
      const caretakerIds = Array.from(new Set((commissions || [])
        .filter((c: any) => c.recipient_type === "caretaker" && c.caretaker_id)
        .map((c: any) => c.caretaker_id)));
      const { data: agentProfiles } = agentIds.length
        ? await supabase.from("profiles").select("user_id, first_name, last_name, email").in("user_id", agentIds)
        : { data: [] as any[] };
      const { data: caretakerNames } = caretakerIds.length
        ? await supabase.from("caretakers").select("id, first_name, last_name, phone").in("id", caretakerIds)
        : { data: [] as any[] };
      const perRecipient: Array<{ label: string; role: string; amount: number }> = [];
      for (const id of agentIds) {
        const amt = (commissions || [])
          .filter((c: any) => c.recipient_user_id === id)
          .reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
        const p = (agentProfiles || []).find((x: any) => x.user_id === id);
        perRecipient.push({
          label: p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : "Agent",
          role: "Agent",
          amount: amt,
        });
      }
      for (const id of caretakerIds) {
        const amt = (commissions || [])
          .filter((c: any) => c.caretaker_id === id)
          .reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
        const c = (caretakerNames || []).find((x: any) => x.id === id);
        perRecipient.push({
          label: c ? `${c.first_name} ${c.last_name}` : "Caretaker",
          role: "Caretaker",
          amount: amt,
        });
      }

      // ---- Tenants & occupancy ----
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, rent_status, monthly_rent")
        .in("property_id", propertyIds);
      const totalTenants = (tenants || []).length;
      const totalUnits = props.reduce((s: number, p: any) => s + (p.total_units || 0), 0);
      const occupancyRate = totalUnits > 0 ? Math.round((totalTenants / totalUnits) * 100) : 0;
      const paidCount = (tenants || []).filter((t: any) => t.rent_status === "paid").length;
      const overdueCount = (tenants || []).filter((t: any) => t.rent_status === "overdue").length;
      const collectionRate = totalTenants > 0 ? Math.round((paidCount / totalTenants) * 100) : 0;
      const expectedRent = (tenants || []).reduce((s: number, t: any) => s + Number(t.monthly_rent), 0);

      const { data: pendingInvoices } = await supabase
        .from("invoices")
        .select("amount")
        .eq("user_id", userId)
        .in("status", ["pending", "overdue"])
        .gte("due_date", monthStart)
        .lt("due_date", monthEnd);
      const totalOutstanding = (pendingInvoices || []).reduce((s: number, i: any) => s + Number(i.amount), 0);

      const grossIncome = totalRevenue + utilityCollected;
      const netIncome = grossIncome - totalExpenses - totalCommissions;

      // Save notification
      await supabase.from("notifications").insert({
        user_id: userId,
        title: `Monthly Report - ${monthLabel}`,
        message: `Gross ${formatCurrency(grossIncome)} | Commissions ${formatCurrency(totalCommissions)} | Expenses ${formatCurrency(totalExpenses)} | Net ${formatCurrency(netIncome)}`,
        type: "info",
        link: "/reports",
      });

      // Email
      if (resendApiKey) {
        try {
          const recipientRows = perRecipient.length
            ? perRecipient.map((r) => `
                <tr>
                  <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">${r.label}</td>
                  <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;">${r.role}</td>
                  <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:600;color:#dc2626;">− ${formatCurrency(r.amount)}</td>
                </tr>`).join("")
            : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">No commissions paid this month.</td></tr>`;

          const utilRowsHtml = Object.keys(utilityByType).length
            ? Object.entries(utilityByType).map(([type, v]) => `
                <tr>
                  <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">${type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                  <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#16a34a;font-weight:600;">${formatCurrency(v.paid)}</td>
                  <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#dc2626;">${formatCurrency(v.outstanding)}</td>
                </tr>`).join("")
            : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">No utility charges recorded.</td></tr>`;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "RentFlow <onboarding@resend.dev>",
              to: [profile.email],
              subject: `📊 Monthly Report ${monthLabel} · Net ${formatCurrency(netIncome)}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;">
                  <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:28px;text-align:center;border-radius:12px 12px 0 0;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">Monthly Financial Report</h1>
                    <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">${monthLabel}</p>
                  </div>
                  <div style="padding:28px;background:#fff;border:1px solid #e5e7eb;">
                    <p style="margin:0 0 20px;">Hi ${profile.first_name || "there"}, here is your full landlord statement.</p>

                    <!-- Top KPIs -->
                    <div style="display:flex;gap:10px;margin:20px 0;">
                      <div style="flex:1;background:#f0fdf4;padding:14px;border-radius:8px;text-align:center;">
                        <p style="margin:0;color:#16a34a;font-size:11px;text-transform:uppercase;">Gross Income</p>
                        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#15803d;">${formatCurrency(grossIncome)}</p>
                      </div>
                      <div style="flex:1;background:#fef2f2;padding:14px;border-radius:8px;text-align:center;">
                        <p style="margin:0;color:#dc2626;font-size:11px;text-transform:uppercase;">Deductions</p>
                        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#b91c1c;">${formatCurrency(totalExpenses + totalCommissions)}</p>
                      </div>
                      <div style="flex:1;background:#eff6ff;padding:14px;border-radius:8px;text-align:center;">
                        <p style="margin:0;color:#2563eb;font-size:11px;text-transform:uppercase;">Your Net</p>
                        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1d4ed8;">${formatCurrency(netIncome)}</p>
                      </div>
                    </div>

                    <!-- Income breakdown -->
                    <h3 style="color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 10px;">Income Breakdown</h3>
                    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">
                      <tr><td style="padding:10px 14px;font-size:13px;color:#475569;">Rent Collected</td><td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#0f172a;">${formatCurrency(totalRevenue)}</td></tr>
                      <tr><td style="padding:10px 14px;font-size:13px;color:#475569;border-top:1px solid #e2e8f0;">Utilities Collected</td><td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#0f172a;border-top:1px solid #e2e8f0;">${formatCurrency(utilityCollected)}</td></tr>
                      <tr><td style="padding:10px 14px;font-size:13px;color:#475569;border-top:1px solid #e2e8f0;">Utilities Outstanding</td><td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#dc2626;border-top:1px solid #e2e8f0;">${formatCurrency(utilityOutstanding)}</td></tr>
                      <tr><td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:700;border-top:2px solid #0f172a;background:#f1f5f9;">Gross Income</td><td style="padding:10px 14px;text-align:right;font-size:14px;font-weight:700;color:#0f172a;border-top:2px solid #0f172a;background:#f1f5f9;">${formatCurrency(grossIncome)}</td></tr>
                    </table>

                    <!-- Utilities by type -->
                    <h3 style="color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 10px;">Utilities & Amenities (${monthLabel})</h3>
                    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                      <thead><tr style="background:#f8fafc;">
                        <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Service</th>
                        <th style="padding:8px 10px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;">Collected</th>
                        <th style="padding:8px 10px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;">Outstanding</th>
                      </tr></thead>
                      <tbody>${utilRowsHtml}</tbody>
                    </table>

                    <!-- Commissions -->
                    <h3 style="color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 10px;">Commissions Paid to Team</h3>
                    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                      <thead><tr style="background:#f8fafc;">
                        <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Recipient</th>
                        <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Role</th>
                        <th style="padding:8px 10px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;">Amount</th>
                      </tr></thead>
                      <tbody>${recipientRows}</tbody>
                      <tfoot>
                        <tr style="background:#f8fafc;">
                          <td style="padding:10px;font-weight:700;color:#0f172a;font-size:13px;">Total (Agents)</td>
                          <td style="padding:10px;"></td>
                          <td style="padding:10px;text-align:right;font-weight:700;color:#dc2626;font-size:13px;">− ${formatCurrency(agentCommission)}</td>
                        </tr>
                        <tr style="background:#f8fafc;">
                          <td style="padding:10px;font-weight:700;color:#0f172a;font-size:13px;">Total (Caretakers)</td>
                          <td style="padding:10px;"></td>
                          <td style="padding:10px;text-align:right;font-weight:700;color:#dc2626;font-size:13px;">− ${formatCurrency(caretakerCommission)}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px;font-weight:800;color:#0f172a;font-size:13px;border-top:2px solid #0f172a;">All Commissions</td>
                          <td style="padding:10px;border-top:2px solid #0f172a;font-size:11px;color:#64748b;">Paid ${formatCurrency(commissionsPaid)} · Pending ${formatCurrency(commissionsPending)}</td>
                          <td style="padding:10px;text-align:right;font-weight:800;color:#dc2626;font-size:14px;border-top:2px solid #0f172a;">− ${formatCurrency(totalCommissions)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    <!-- Landlord P&L -->
                    <h3 style="color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 10px;">Your Take-Home</h3>
                    <table style="width:100%;border-collapse:collapse;background:#0f172a;color:#fff;border-radius:8px;overflow:hidden;">
                      <tr><td style="padding:10px 14px;font-size:13px;color:#cbd5e1;">Gross Income</td><td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;">${formatCurrency(grossIncome)}</td></tr>
                      <tr><td style="padding:10px 14px;font-size:13px;color:#cbd5e1;">Operating Expenses</td><td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#fca5a5;">− ${formatCurrency(totalExpenses)}</td></tr>
                      <tr><td style="padding:10px 14px;font-size:13px;color:#cbd5e1;">Agent + Caretaker Commissions</td><td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#fca5a5;">− ${formatCurrency(totalCommissions)}</td></tr>
                      <tr><td style="padding:12px 14px;font-size:14px;font-weight:800;border-top:2px solid #334155;">Your Net Income</td><td style="padding:12px 14px;text-align:right;font-size:18px;font-weight:800;color:#4ade80;border-top:2px solid #334155;">${formatCurrency(netIncome)}</td></tr>
                    </table>

                    <!-- Portfolio -->
                    <h3 style="color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 10px;">Portfolio & Collection</h3>
                    <table style="width:100%;border-collapse:collapse;">
                      <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Total Properties</td><td style="padding:8px;text-align:right;font-weight:600;">${props.length}</td></tr>
                      <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Occupied Units</td><td style="padding:8px;text-align:right;font-weight:600;">${totalTenants} / ${totalUnits} (${occupancyRate}%)</td></tr>
                      <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Expected Rent</td><td style="padding:8px;text-align:right;font-weight:600;">${formatCurrency(expectedRent)}</td></tr>
                      <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Collection Rate</td><td style="padding:8px;text-align:right;font-weight:600;">${collectionRate}%</td></tr>
                      <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Overdue Tenants</td><td style="padding:8px;text-align:right;font-weight:600;color:#dc2626;">${overdueCount}</td></tr>
                      <tr><td style="padding:8px;color:#6b7280;font-size:13px;">Outstanding Invoices</td><td style="padding:8px;text-align:right;font-weight:600;color:#dc2626;">${formatCurrency(totalOutstanding)}</td></tr>
                    </table>

                    <p style="color:#94a3b8;font-size:11px;margin-top:24px;text-align:center;">Automated report from RentFlow · ${today.toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })}</p>
                  </div>
                </div>`,
            }),
          });
          reportsSent++;
        } catch (e) {
          console.error("Failed to send report email:", e);
        }
      }

      // SMS digest
      const atUser = Deno.env.get("AFRICASTALKING_USERNAME");
      const atKey = Deno.env.get("AFRICASTALKING_API_KEY");
      const phone = profile.phone;
      if (atUser && atKey && phone) {
        try {
          const smsBody = `RentFlow ${monthLabel}: Gross ${formatCurrency(grossIncome)}, Commissions ${formatCurrency(totalCommissions)}, Expenses ${formatCurrency(totalExpenses)}, Your Net ${formatCurrency(netIncome)}.`;
          await fetch("https://api.africastalking.com/version1/messaging", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", apiKey: atKey, Accept: "application/json" },
            body: new URLSearchParams({ username: atUser, to: phone, message: smsBody }).toString(),
          });
        } catch (e) {
          console.error("Failed to send SMS digest:", e);
        }
      }
    }

    console.log(`Monthly reports: ${reportsSent} sent`);

    return new Response(
      JSON.stringify({ reportsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in monthly-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
