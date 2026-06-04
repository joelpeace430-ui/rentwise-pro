// Public M-Pesa C2B Confirmation/Validation endpoint.
// Safaricom calls: /functions/v1/mpesa-c2b-callback?shortcode=XXX&secret=YYY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const shortcodeParam = url.searchParams.get("shortcode");
    const secretParam = url.searchParams.get("secret");

    if (!shortcodeParam || !secretParam) {
      return new Response(
        JSON.stringify({ ResultCode: "C2B00011", ResultDesc: "Missing identifiers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: settings } = await supabase
      .from("mpesa_settings")
      .select("*")
      .eq("shortcode", shortcodeParam)
      .eq("callback_secret", secretParam)
      .eq("is_active", true)
      .maybeSingle();

    if (!settings) {
      console.warn("Rejected C2B: invalid shortcode/secret", shortcodeParam);
      return new Response(
        JSON.stringify({ ResultCode: "C2B00011", ResultDesc: "Rejected" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await req.json();
    console.log("C2B payload:", JSON.stringify(payload));

    // Safaricom sends fields like: TransID, TransAmount, MSISDN, BillRefNumber,
    // FirstName, MiddleName, LastName, BusinessShortCode, TransTime
    const transId = payload.TransID || payload.transID || crypto.randomUUID();
    const amount = parseFloat(payload.TransAmount || payload.transAmount || "0");
    const msisdn = String(payload.MSISDN || payload.msisdn || "").replace(/^0/, "254");
    const accountRef = String(payload.BillRefNumber || payload.billRefNumber || "").trim();
    const transTime = payload.TransTime || payload.transTime;

    // Skip if we already recorded this transaction
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .ilike("notes", `%${transId}%`)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Match tenant: by BillRefNumber (unit number or phone) or by MSISDN
    let tenant: any = null;
    if (accountRef) {
      const { data } = await supabase
        .from("tenants")
        .select("id, user_id, first_name, last_name, phone, unit_number")
        .eq("user_id", settings.user_id)
        .or(`unit_number.eq.${accountRef},phone.eq.${accountRef},phone.eq.254${accountRef.replace(/^0/, "")}`)
        .limit(1)
        .maybeSingle();
      tenant = data;
    }
    if (!tenant && msisdn) {
      const last9 = msisdn.slice(-9);
      const { data } = await supabase
        .from("tenants")
        .select("id, user_id, first_name, last_name, phone, unit_number")
        .eq("user_id", settings.user_id)
        .or(`phone.eq.${msisdn},phone.eq.0${last9},phone.eq.+${msisdn}`)
        .limit(1)
        .maybeSingle();
      tenant = data;
    }

    if (!tenant) {
      // Still acknowledge; log for manual reconciliation
      console.warn("C2B: no matching tenant", { accountRef, msisdn, shortcode: shortcodeParam });
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auto-match oldest unpaid invoice
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("tenant_id", tenant.id)
      .in("status", ["pending", "overdue"])
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    const paymentDate = transTime
      ? `${transTime.slice(0,4)}-${transTime.slice(4,6)}-${transTime.slice(6,8)}`
      : new Date().toISOString().slice(0, 10);

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        user_id: settings.user_id,
        tenant_id: tenant.id,
        invoice_id: invoice?.id ?? null,
        amount,
        payment_method: "mpesa",
        payment_date: paymentDate,
        status: "completed",
        notes: `M-Pesa C2B Receipt: ${transId} | Phone: ${msisdn} | Account: ${accountRef || "n/a"}`,
      })
      .select()
      .single();

    if (payErr) {
      console.error("Insert payment failed:", payErr);
    } else if (invoice) {
      await supabase.from("invoices").update({ status: "paid" }).eq("id", invoice.id);
      await supabase.from("tenants").update({ rent_status: "paid" }).eq("id", tenant.id);
    }

    if (payment) {
      try {
        await supabase.functions.invoke("generate-receipt", { body: { paymentId: payment.id } });
      } catch (e) {
        console.error("Receipt generation failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("C2B error:", e);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
