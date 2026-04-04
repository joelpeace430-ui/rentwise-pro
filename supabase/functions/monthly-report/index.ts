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

      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name, business_name")
        .eq("user_id", userId)
        .single();

      if (!profile?.email) continue;

      // Revenue (completed payments)
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("payment_date", monthStart)
        .lt("payment_date", monthEnd);

      const totalRevenue = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);

      // Expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", userId)
        .gte("expense_date", monthStart)
        .lt("expense_date", monthEnd);

      const totalExpenses = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

      // Tenants & occupancy
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
      const outstandingBalance = Math.max(0, expectedRent - totalRevenue);

      // Outstanding invoices
      const { data: pendingInvoices } = await supabase
        .from("invoices")
        .select("amount")
        .eq("user_id", userId)
        .in("status", ["pending", "overdue"])
        .gte("due_date", monthStart)
        .lt("due_date", monthEnd);

      const totalOutstanding = (pendingInvoices || []).reduce((s: number, i: any) => s + Number(i.amount), 0);

      const netIncome = totalRevenue - totalExpenses;

      // Save notification
      await supabase.from("notifications").insert({
        user_id: userId,
        title: `Monthly Report - ${monthLabel}`,
        message: `Revenue: ${formatCurrency(totalRevenue)} | Expenses: ${formatCurrency(totalExpenses)} | Net: ${formatCurrency(netIncome)} | Collection: ${collectionRate}% | Occupancy: ${occupancyRate}%`,
        type: "info",
        link: "/reports",
      });

      // Send email report
      if (resendApiKey) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "RentFlow <onboarding@resend.dev>",
              to: [profile.email],
              subject: `📊 Monthly Financial Report - ${monthLabel}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;">
                  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px;text-align:center;border-radius:12px 12px 0 0;">
                    <h1 style="color:#fff;margin:0;font-size:24px;">📊 Monthly Financial Report</h1>
                    <p style="color:#93c5fd;margin:8px 0 0;font-size:16px;">${monthLabel}</p>
                  </div>
                  <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;">
                    <p style="margin:0 0 24px;">Hi ${profile.first_name || "there"},</p>
                    <p>Here's your financial summary for <strong>${monthLabel}</strong>:</p>

                    <div style="display:flex;gap:12px;margin:24px 0;">
                      <div style="flex:1;background:#f0fdf4;padding:16px;border-radius:8px;text-align:center;">
                        <p style="margin:0;color:#16a34a;font-size:12px;text-transform:uppercase;">Revenue</p>
                        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#15803d;">${formatCurrency(totalRevenue)}</p>
                      </div>
                      <div style="flex:1;background:#fef2f2;padding:16px;border-radius:8px;text-align:center;">
                        <p style="margin:0;color:#dc2626;font-size:12px;text-transform:uppercase;">Expenses</p>
                        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#b91c1c;">${formatCurrency(totalExpenses)}</p>
                      </div>
                      <div style="flex:1;background:#eff6ff;padding:16px;border-radius:8px;text-align:center;">
                        <p style="margin:0;color:#2563eb;font-size:12px;text-transform:uppercase;">Net Income</p>
                        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#1d4ed8;">${formatCurrency(netIncome)}</p>
                      </div>
                    </div>

                    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
                      <tr style="background:#f9fafb;"><th colspan="2" style="padding:12px;text-align:left;font-size:14px;border-bottom:2px solid #e5e7eb;">Property Overview</th></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Total Properties</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${props.length}</td></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Total Units</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${totalUnits}</td></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Occupied Units</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${totalTenants}</td></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Occupancy Rate</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${occupancyRate}%</td></tr>
                    </table>

                    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
                      <tr style="background:#f9fafb;"><th colspan="2" style="padding:12px;text-align:left;font-size:14px;border-bottom:2px solid #e5e7eb;">Collection Summary</th></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Expected Rent</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${formatCurrency(expectedRent)}</td></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Collected</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#16a34a;">${formatCurrency(totalRevenue)}</td></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Outstanding</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#dc2626;">${formatCurrency(totalOutstanding)}</td></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Collection Rate</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${collectionRate}%</td></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Tenants Paid</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#16a34a;">${paidCount} of ${totalTenants}</td></tr>
                      <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#6b7280;">Tenants Overdue</td><td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#dc2626;">${overdueCount}</td></tr>
                    </table>

                    <p style="color:#6b7280;font-size:12px;margin-top:24px;text-align:center;">This report was automatically generated by RentFlow on ${today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>
                  </div>
                  <div style="background:#f9fafb;padding:16px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
                    <p style="margin:0;color:#9ca3af;font-size:11px;">RentFlow Property Management</p>
                  </div>
                </div>`,
            }),
          });
          reportsSent++;
        } catch (e) {
          console.error("Failed to send report email:", e);
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
