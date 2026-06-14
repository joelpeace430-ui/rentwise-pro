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

    // Re-fetch tenant with monthly_rent & property_id for expected-amount calc
    const { data: tenantFull } = await supabase
      .from("tenants")
      .select("id, user_id, monthly_rent, property_id")
      .eq("id", tenant.id)
      .maybeSingle();

    // Auto-match oldest unpaid invoice
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, amount, due_date")
      .eq("tenant_id", tenant.id)
      .in("status", ["pending", "overdue"])
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    const expectedAmount = Number(invoice?.amount ?? tenantFull?.monthly_rent ?? 0);

    const paymentDate = transTime
      ? `${transTime.slice(0,4)}-${transTime.slice(4,6)}-${transTime.slice(6,8)}`
      : new Date().toISOString().slice(0, 10);

    // Insert payment
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
    } else {
      // Reconcile: sum all completed payments against the expected amount
      let totalPaid = amount;
      if (invoice) {
        const { data: allPayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("invoice_id", invoice.id)
          .eq("status", "completed");
        totalPaid = (allPayments || []).reduce((s, p) => s + Number(p.amount), 0);
      }

      const balance = expectedAmount - totalPaid;
      const fullyPaid = expectedAmount > 0 && balance <= 0;
      const partial = expectedAmount > 0 && totalPaid > 0 && balance > 0;

      console.log(`Reconcile: expected=${expectedAmount} paid=${totalPaid} balance=${balance} fully=${fullyPaid} partial=${partial}`);

      // Update invoice + tenant status
      if (invoice && fullyPaid) {
        await supabase.from("invoices").update({ status: "paid" }).eq("id", invoice.id);
      }
      await supabase
        .from("tenants")
        .update({ rent_status: fullyPaid ? "paid" : "pending" })
        .eq("id", tenant.id);

      // Track debt: upsert tenant_debts for the current month
      if (tenantFull?.property_id && expectedAmount > 0) {
        const monthYear = (invoice?.due_date || paymentDate).slice(0, 7); // YYYY-MM
        const dueDate = invoice?.due_date || paymentDate;

        // Look for existing debt row for this month
        const { data: existingDebt } = await supabase
          .from("tenant_debts")
          .select("id, amount_paid, penalty_amount, rent_amount")
          .eq("tenant_id", tenant.id)
          .eq("month_year", monthYear)
          .maybeSingle();

        if (existingDebt) {
          const newPaid = Number(existingDebt.amount_paid) + amount;
          const newTotalOwed = Math.max(
            0,
            Number(existingDebt.rent_amount) + Number(existingDebt.penalty_amount) - newPaid
          );
          const { error: updErr } = await supabase
            .from("tenant_debts")
            .update({
              amount_paid: newPaid,
              total_owed: newTotalOwed,
              status: newTotalOwed <= 0 ? "paid" : "partial",
            })
            .eq("id", existingDebt.id);
          if (updErr) console.error("tenant_debts update failed:", updErr);
        } else if (!fullyPaid) {
          // Only create a debt row when there's an outstanding balance
          const { error: insErr } = await supabase.from("tenant_debts").insert({
            user_id: settings.user_id,
            tenant_id: tenant.id,
            property_id: tenantFull.property_id,
            month_year: monthYear,
            due_date: dueDate,
            rent_amount: expectedAmount,
            amount_paid: amount,
            total_owed: Math.max(0, expectedAmount - amount),
            status: "partial",
            notes: `Auto-created from M-Pesa C2B ${transId}`,
          });
          if (insErr) console.error("tenant_debts insert failed:", insErr);
        }
      }
    }

    if (payment) {
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-receipt`;
        const r = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ paymentId: payment.id }),
        });
        console.log(`generate-receipt status=${r.status} body=${await r.text()}`);
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
