import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const prettyUtility = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface AfricasTalkingResponse {
  SMSMessageData?: {
    Recipients: Array<{ statusCode: number; status: string }>;
  };
}

const sendSMS = async (
  phoneNumber: string,
  message: string,
  apiKey: string,
  username: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/-/g, "");
    if (formattedPhone.startsWith("0")) formattedPhone = "+254" + formattedPhone.substring(1);
    else if (!formattedPhone.startsWith("+")) formattedPhone = "+254" + formattedPhone;

    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey,
      },
      body: new URLSearchParams({ username, to: formattedPhone, message }),
    });

    const data: AfricasTalkingResponse = await response.json();
    if (data.SMSMessageData?.Recipients?.[0]?.statusCode === 101) return { success: true };
    return { success: false, error: data.SMSMessageData?.Recipients?.[0]?.status || "Unknown error" };
  } catch (error) {
    console.error("SMS send error:", error);
    return { success: false, error: String(error) };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const apiKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const username = Deno.env.get("AFRICASTALKING_USERNAME");

    if (!apiKey || !username) {
      return new Response(
        JSON.stringify({ message: "SMS reminders not configured (Africa's Talking credentials missing)." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rent reminders are now driven by outstanding debt, not invoices.
    const { data: debts, error: debtErr } = await supabase
      .from("tenant_debts")
      .select(`
        id, tenant_id, user_id, month_year, rent_amount, amount_paid,
        penalty_amount, total_owed, due_date, status,
        tenant:tenants(
          id, first_name, last_name, phone, unit_number, monthly_rent,
          property:properties(name)
        )
      `)
      .neq("status", "paid")
      .gt("total_owed", 0);

    if (debtErr) throw debtErr;

    if (!debts || debts.length === 0) {
      return new Response(JSON.stringify({ message: "No outstanding balances to remind about" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by tenant so each tenant gets ONE consolidated reminder
    const byTenant = new Map<string, any[]>();
    for (const d of debts) {
      if (!d.tenant_id) continue;
      const list = byTenant.get(d.tenant_id) || [];
      list.push(d);
      byTenant.set(d.tenant_id, list);
    }

    const results: Array<{ tenant: string; phone: string; status: string }> = [];

    for (const [tenantId, rows] of byTenant) {
      const tenant: any = rows[0].tenant;
      if (!tenant?.phone) continue;

      const propertyName = Array.isArray(tenant.property) ? tenant.property[0]?.name : tenant.property?.name;

      const rentOutstanding = rows.reduce(
        (s, r) => s + Math.max(0, Number(r.rent_amount) - Number(r.amount_paid)),
        0,
      );
      const penalties = rows.reduce((s, r) => s + Number(r.penalty_amount || 0), 0);
      const arrearsMonths = rows.length;
      const earliestDue = rows
        .map((r) => r.due_date)
        .filter(Boolean)
        .sort()[0];

      // Unpaid utilities / amenities (garbage, water, etc.)
      const { data: utils } = await supabase
        .from("utility_bills")
        .select("utility_type, total_amount, billing_period")
        .eq("tenant_id", tenantId)
        .neq("status", "paid");

      const utilTotal = (utils || []).reduce((s, u) => s + Number(u.total_amount), 0);
      const utilLine = (utils || []).length
        ? `\nAmenities: ${(utils || [])
            .map((u) => `${prettyUtility(u.utility_type)} ${formatCurrency(Number(u.total_amount))}`)
            .join(", ")}`
        : "";

      const grandTotal = rentOutstanding + penalties + utilTotal;
      if (grandTotal <= 0) continue;

      const message =
        `Hi ${tenant.first_name}, balance for ${propertyName || "your property"} Unit ${tenant.unit_number}:\n` +
        `Rent due: ${formatCurrency(rentOutstanding)}${arrearsMonths > 1 ? ` (${arrearsMonths} months)` : ""}` +
        (penalties > 0 ? `\nLate penalty: ${formatCurrency(penalties)}` : "") +
        utilLine +
        `\nTOTAL DUE: ${formatCurrency(grandTotal)}` +
        (earliestDue
          ? `\nDue since: ${new Date(earliestDue).toLocaleDateString("en-KE", { dateStyle: "medium" })}`
          : "") +
        `\n\nPay via M-Pesa Paybill/Till using Unit ${tenant.unit_number} as account. A receipt with your updated balance is sent automatically after payment.`;

      const smsResult = await sendSMS(tenant.phone, message, apiKey, username);

      await supabase.from("sms_logs").insert({
        user_id: rows[0].user_id,
        tenant_id: tenantId,
        message_type: "payment_prompt",
        message_content: message,
        phone_number: tenant.phone,
        status: smsResult.success ? "sent" : "failed",
        error_message: smsResult.error ?? null,
      });

      results.push({
        tenant: `${tenant.first_name} ${tenant.last_name}`,
        phone: tenant.phone,
        status: smsResult.success ? "sent" : `failed: ${smsResult.error}`,
      });
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    return new Response(JSON.stringify({ message: `Sent ${sentCount} SMS reminders`, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-sms-reminder function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
