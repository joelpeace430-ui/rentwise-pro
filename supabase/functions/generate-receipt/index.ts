import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReceiptRequest {
  paymentId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);

const prettyUtility = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const generateReceiptHTML = (
  receipt: any,
  payment: any,
  analysis: {
    monthLabel: string;
    rentDue: number;
    penalty: number;
    previousBalance: number;
    totalDueBeforePayment: number;
    thisPayment: number;
    remainingBalance: number;
    yearToDatePaid: number;
    utilities: Array<{ type: string; period: string; amount: number; status: string; due_date: string | null }>;
  },
) => {
  const tenant = payment.tenant;
  const property = tenant?.property;
  const a = analysis;
  const statusColor = a.remainingBalance <= 0 ? "#16a34a" : "#dc2626";
  const statusText = a.remainingBalance <= 0 ? "✓ Fully Paid" : `Balance: ${formatCurrency(a.remainingBalance)}`;

  const utilRows = a.utilities.length
    ? a.utilities
        .map(
          (u) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;">${prettyUtility(u.type)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:12px;">${u.period}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#0f172a;font-size:13px;font-weight:600;">${formatCurrency(Number(u.amount))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:11px;text-transform:uppercase;color:${u.status === "paid" ? "#16a34a" : "#dc2626"};">${u.status}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">No utility charges on file.</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f172a;padding:28px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Payment Receipt</h1>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${receipt.receipt_number} · ${a.monthLabel}</p>
    </div>

    <div style="padding:28px 40px;">
      <p style="color:#334155;font-size:14px;margin:0 0 8px;">Dear ${tenant?.first_name} ${tenant?.last_name},</p>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px;">We've received your payment for <strong>${property?.name || "your unit"} · ${tenant?.unit_number || ""}</strong>. Full analysis below.</p>

      <!-- Payment summary -->
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Amount Paid</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;font-size:20px;color:#0f172a;">${formatCurrency(a.thisPayment)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Method</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f172a;font-size:13px;">${payment.payment_method === "mpesa" ? "M-Pesa" : payment.payment_method.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:13px;">Date</td>
          <td style="padding:10px 0;text-align:right;color:#0f172a;font-size:13px;">${new Date(payment.payment_date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</td>
        </tr>
      </table>

      <!-- Debt analysis -->
      <h3 style="color:#0f172a;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Account Analysis — ${a.monthLabel}</h3>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;margin:0 0 20px;">
        <tr>
          <td style="padding:10px 14px;color:#475569;font-size:13px;">Rent Due</td>
          <td style="padding:10px 14px;text-align:right;color:#0f172a;font-size:13px;font-weight:600;">${formatCurrency(a.rentDue)}</td>
        </tr>
        ${a.previousBalance > 0 ? `
        <tr>
          <td style="padding:10px 14px;color:#475569;font-size:13px;border-top:1px solid #e2e8f0;">Previous Balance</td>
          <td style="padding:10px 14px;text-align:right;color:#dc2626;font-size:13px;font-weight:600;border-top:1px solid #e2e8f0;">${formatCurrency(a.previousBalance)}</td>
        </tr>` : ""}
        ${a.penalty > 0 ? `
        <tr>
          <td style="padding:10px 14px;color:#475569;font-size:13px;border-top:1px solid #e2e8f0;">Late Penalty</td>
          <td style="padding:10px 14px;text-align:right;color:#dc2626;font-size:13px;font-weight:600;border-top:1px solid #e2e8f0;">${formatCurrency(a.penalty)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:10px 14px;color:#0f172a;font-size:13px;font-weight:700;border-top:1px solid #e2e8f0;background:#f1f5f9;">Total Owed</td>
          <td style="padding:10px 14px;text-align:right;color:#0f172a;font-size:14px;font-weight:700;border-top:1px solid #e2e8f0;background:#f1f5f9;">${formatCurrency(a.totalDueBeforePayment)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#16a34a;font-size:13px;">This Payment</td>
          <td style="padding:10px 14px;text-align:right;color:#16a34a;font-size:13px;font-weight:600;">− ${formatCurrency(a.thisPayment)}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;color:#0f172a;font-size:14px;font-weight:700;border-top:2px solid #0f172a;">Remaining Balance</td>
          <td style="padding:12px 14px;text-align:right;color:${statusColor};font-size:16px;font-weight:800;border-top:2px solid #0f172a;">${formatCurrency(Math.max(0, a.remainingBalance))}</td>
        </tr>
      </table>

      <!-- Utilities / amenities -->
      <h3 style="color:#0f172a;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Utilities & Amenities</h3>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:0 0 20px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Service</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Period</th>
            <th style="padding:8px 10px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Amount</th>
            <th style="padding:8px 10px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Status</th>
          </tr>
        </thead>
        <tbody>${utilRows}</tbody>
      </table>

      <!-- YTD -->
      <div style="background:#0f172a;color:#fff;padding:14px 18px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin:0 0 18px;">
        <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Paid Year-to-Date</span>
        <span style="font-size:16px;font-weight:700;">${formatCurrency(a.yearToDatePaid)}</span>
      </div>

      <div style="background:${a.remainingBalance <= 0 ? "#dcfce7" : "#fef3c7"};border-radius:8px;padding:14px 18px;text-align:center;margin:0 0 20px;">
        <p style="color:${statusColor};font-weight:700;font-size:14px;margin:0;">${statusText}</p>
      </div>

      <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">Automated receipt from RentFlow. Keep this email for your records.</p>
    </div>
  </div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bearer = authHeader.replace("Bearer ", "").trim();
    const isInternal = bearer === supabaseServiceKey;

    let callerUserId: string | null = null;
    if (!isInternal) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await authClient.auth.getUser(bearer);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerUserId = user.id;
    }

    const { paymentId }: ReceiptRequest = await req.json();
    if (!paymentId) throw new Error("Payment ID is required");

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        tenant:tenants(
          id, first_name, last_name, email, phone, unit_number, monthly_rent,
          property:properties(name, address)
        )
      `)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      throw new Error("Payment not found");
    }

    if (!isInternal && payment.user_id !== callerUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if receipt already exists
    const { data: existingReceipt } = await supabase
      .from("receipts")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (existingReceipt) {
      return new Response(
        JSON.stringify({ message: "Receipt already exists", receiptId: existingReceipt.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const timestamp = Date.now();
    const receiptNumber = `RCT-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        user_id: payment.user_id,
        payment_id: paymentId,
        tenant_id: payment.tenant_id,
        receipt_number: receiptNumber,
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_date: payment.payment_date,
        sent_to_email: payment.tenant?.email,
      })
      .select()
      .single();

    if (receiptError) {
      console.error("Failed to create receipt:", receiptError);
      throw new Error("Failed to create receipt");
    }

    // ---------- Build debt analysis ----------
    const tenantId = payment.tenant_id as string;
    const monthYear = String(payment.payment_date).slice(0, 7); // YYYY-MM
    const [yy, mm] = monthYear.split("-").map(Number);
    const monthLabel = new Date(yy, mm - 1, 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
    const yearStart = `${yy}-01-01`;
    const nextYear = `${yy + 1}-01-01`;

    // Current month debt row (source of truth for penalty + rent)
    const { data: debtRow } = await supabase
      .from("tenant_debts")
      .select("rent_amount, penalty_amount, amount_paid, total_owed")
      .eq("tenant_id", tenantId)
      .eq("month_year", monthYear)
      .maybeSingle();

    // Prior unpaid debt (previous months)
    const { data: priorDebts } = await supabase
      .from("tenant_debts")
      .select("total_owed, month_year")
      .eq("tenant_id", tenantId)
      .neq("status", "paid")
      .lt("month_year", monthYear);
    const previousBalance = (priorDebts || []).reduce((s, d) => s + Number(d.total_owed), 0);

    const rentDue = Number(debtRow?.rent_amount ?? payment.tenant?.monthly_rent ?? 0);
    const penalty = Number(debtRow?.penalty_amount ?? 0);
    const paidThisMonth = Number(debtRow?.amount_paid ?? Number(payment.amount));
    const totalDueBeforePayment = rentDue + penalty + previousBalance;
    const remainingBalance = Math.max(0, totalDueBeforePayment - paidThisMonth);

    // YTD paid
    const { data: ytdPays } = await supabase
      .from("payments")
      .select("amount")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("payment_date", yearStart)
      .lt("payment_date", nextYear);
    const yearToDatePaid = (ytdPays || []).reduce((s, p) => s + Number(p.amount), 0);

    // Utilities for the tenant (this month + any unpaid)
    const { data: utilRows } = await supabase
      .from("utility_bills")
      .select("utility_type, billing_period, total_amount, status, due_date")
      .eq("tenant_id", tenantId)
      .order("billing_period", { ascending: false })
      .limit(10);
    const utilities = (utilRows || []).map((u) => ({
      type: u.utility_type,
      period: u.billing_period,
      amount: Number(u.total_amount),
      status: u.status,
      due_date: u.due_date,
    }));

    const analysis = {
      monthLabel,
      rentDue,
      penalty,
      previousBalance,
      totalDueBeforePayment,
      thisPayment: Number(payment.amount),
      remainingBalance,
      yearToDatePaid,
      utilities,
    };

    console.log(`Receipt ${receiptNumber} for payment ${paymentId}`, analysis);

    let emailSent = false;
    if (resendApiKey && payment.tenant?.email) {
      try {
        const html = generateReceiptHTML(receipt, payment, analysis);
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Rent Receipts <onboarding@resend.dev>",
            to: [payment.tenant.email],
            subject: `Receipt ${receiptNumber} · ${formatCurrency(Number(payment.amount))} · Balance ${formatCurrency(remainingBalance)}`,
            html,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
          await supabase.from("receipts").update({ sent_at: new Date().toISOString() }).eq("id", receipt.id);
          console.log(`Receipt email sent to ${payment.tenant.email}`);
        } else {
          console.error("Resend error:", await emailRes.text());
        }
      } catch (emailErr) {
        console.error("Failed to send receipt email:", emailErr);
      }
    }

    // ---------- SMS receipt (with debt summary) ----------
    let smsSent = false;
    const atKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const atUser = Deno.env.get("AFRICASTALKING_USERNAME");
    const tenantPhone: string | undefined = payment.tenant?.phone;
    if (atKey && atUser && tenantPhone) {
      let phone = String(tenantPhone).replace(/[\s-]/g, "");
      if (phone.startsWith("0")) phone = "+254" + phone.slice(1);
      else if (!phone.startsWith("+")) phone = "+254" + phone;

      const unpaidUtilTotal = utilities
        .filter((u) => u.status !== "paid")
        .reduce((s, u) => s + u.amount, 0);

      const smsText =
        `Payment received. Receipt ${receiptNumber}\n` +
        `Amount paid: ${formatCurrency(Number(payment.amount))}\n` +
        `${monthLabel} rent: ${formatCurrency(rentDue)}` +
        (penalty > 0 ? `\nPenalty: ${formatCurrency(penalty)}` : "") +
        (previousBalance > 0 ? `\nArrears: ${formatCurrency(previousBalance)}` : "") +
        (unpaidUtilTotal > 0 ? `\nAmenities due: ${formatCurrency(unpaidUtilTotal)}` : "") +
        `\nBALANCE: ${formatCurrency(remainingBalance)}` +
        (remainingBalance === 0 ? "\nYou are fully paid. Thank you!" : "\nKindly clear the balance to avoid penalties.");

      try {
        const smsRes = await fetch("https://api.africastalking.com/version1/messaging", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            apiKey: atKey,
          },
          body: new URLSearchParams({ username: atUser, to: phone, message: smsText }),
        });
        const smsData = await smsRes.json();
        smsSent = smsData?.SMSMessageData?.Recipients?.[0]?.statusCode === 101;

        await supabase.from("sms_logs").insert({
          user_id: payment.user_id,
          tenant_id: tenantId,
          message_type: "receipt_request",
          message_content: smsText,
          phone_number: phone,
          status: smsSent ? "sent" : "failed",
          error_message: smsSent ? null : JSON.stringify(smsData).slice(0, 500),
        });
      } catch (smsErr) {
        console.error("Receipt SMS failed:", smsErr);
      }
    }

    return new Response(
      JSON.stringify({ message: "Receipt generated successfully", receipt, analysis, emailSent, smsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error in generate-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
