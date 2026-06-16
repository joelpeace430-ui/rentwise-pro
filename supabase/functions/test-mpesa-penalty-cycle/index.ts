// Automated end-to-end test:
//   1) Seeds a temporary landlord/property/tenant/invoice + mpesa_settings.
//   2) Sends a partial M-Pesa C2B payment -> asserts a "partial" tenant_debts row.
//   3) Locks a penalty onto that debt row.
//   4) Sends a second C2B payment covering the remaining rent + penalty.
//   5) Asserts: invoice & tenant marked paid, debt cleared, penalty NOT
//      re-applied, and only ONE debt row exists for the month.
//   6) Cleans up all seeded data.
//
// Trigger with:
//   POST /functions/v1/test-mpesa-penalty-cycle
//   { "landlord_user_id": "<uuid>" }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Step = { name: string; ok: boolean; details?: unknown };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey);

  const steps: Step[] = [];
  const push = (name: string, ok: boolean, details?: unknown) => {
    steps.push({ name, ok, details });
    console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`, details ?? "");
  };

  // Resolve a landlord user_id to attach the test data to.
  let landlordId: string | null = null;
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    landlordId = body?.landlord_user_id ?? null;
  } catch (_) { /* noop */ }
  if (!landlordId) {
    const { data } = await supabase
      .from("user_roles").select("user_id").eq("role", "landlord").limit(1).maybeSingle();
    landlordId = data?.user_id ?? null;
  }
  if (!landlordId) {
    return json({ ok: false, error: "no landlord user available" }, 400);
  }

  const tag = `TEST-${Date.now()}`;
  const monthYear = new Date().toISOString().slice(0, 7);
  const dueDate = `${monthYear}-01`;
  const rentAmount = 1000;
  const penaltyAmount = 50;
  const partialAmount = 600;
  const remainderAmount = (rentAmount - partialAmount) + penaltyAmount; // 450
  const shortcode = `T${Math.floor(Math.random() * 1e6)}`;
  const secret = crypto.randomUUID().replace(/-/g, "");
  const phone = `2547${Math.floor(1e8 + Math.random() * 9e8)}`;
  const unitNumber = `${tag}-U1`;

  // ----- Seed -----
  const cleanupIds: Record<string, string[]> = {
    property: [], tenant: [], invoice: [], mpesa_settings: [],
  };

  try {
    const { data: prop, error: propErr } = await supabase.from("properties").insert({
      user_id: landlordId, name: tag, address: "Test", total_units: 1,
      penalty_type: "fixed", penalty_rate: penaltyAmount,
    } as any).select().single();
    if (propErr) throw propErr;
    cleanupIds.property.push(prop.id);

    const { data: tenant, error: tenErr } = await supabase.from("tenants").insert({
      user_id: landlordId, property_id: prop.id,
      first_name: "Test", last_name: tag, email: `${tag}@test.local`,
      phone, unit_number: unitNumber, monthly_rent: rentAmount,
      lease_start: dueDate, lease_end: `${Number(monthYear.slice(0,4)) + 1}-${monthYear.slice(5)}-01`,
      rent_status: "pending",
    } as any).select().single();
    if (tenErr) throw tenErr;
    cleanupIds.tenant.push(tenant.id);

    const { data: invoice, error: invErr } = await supabase.from("invoices").insert({
      user_id: landlordId, tenant_id: tenant.id,
      invoice_number: `INV-${tag}`, amount: rentAmount,
      due_date: dueDate, status: "pending",
    } as any).select().single();
    if (invErr) throw invErr;
    cleanupIds.invoice.push(invoice.id);

    const { data: settings, error: setErr } = await supabase.from("mpesa_settings").insert({
      user_id: landlordId, shortcode, callback_secret: secret,
      consumer_key: "test", consumer_secret: "test",
      environment: "sandbox", is_active: true,
    } as any).select().single();
    if (setErr) throw setErr;
    cleanupIds.mpesa_settings.push(settings.id);

    push("seed", true, { tenant: tenant.id, invoice: invoice.id });

    // ----- Step 1: partial payment -----
    const callbackUrl = `${url}/functions/v1/mpesa-c2b-callback?shortcode=${shortcode}&secret=${secret}`;
    const sendC2B = async (amt: number, transId: string) =>
      fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TransID: transId, TransAmount: String(amt),
          MSISDN: phone, BillRefNumber: unitNumber,
          TransTime: monthYear.replace("-", "") + "01120000",
        }),
      });

    const r1 = await sendC2B(partialAmount, `${tag}-P1`);
    await r1.text();
    push("c2b partial sent", r1.ok, { status: r1.status });

    const { data: debt1 } = await supabase.from("tenant_debts")
      .select("*").eq("tenant_id", tenant.id).eq("month_year", monthYear).maybeSingle();
    push("partial -> tenant_debts.partial exists",
      !!debt1 && debt1.status === "partial" &&
        Number(debt1.amount_paid) === partialAmount &&
        Number(debt1.total_owed) === rentAmount - partialAmount,
      debt1);

    const { data: tenAfter1 } = await supabase.from("tenants")
      .select("rent_status").eq("id", tenant.id).maybeSingle();
    push("tenant.rent_status=pending after partial",
      tenAfter1?.rent_status === "pending", tenAfter1);

    // ----- Step 2: lock a penalty (simulating calculate-penalties) -----
    const { error: penErr } = await supabase.from("tenant_debts").update({
      penalty_amount: penaltyAmount,
      penalty_applied_at: new Date().toISOString(),
      total_owed: (rentAmount - partialAmount) + penaltyAmount,
      status: "overdue",
    }).eq("id", debt1!.id);
    push("penalty locked", !penErr, penErr);

    // ----- Step 3: remainder + penalty payment -----
    const r2 = await sendC2B(remainderAmount, `${tag}-P2`);
    await r2.text();
    push("c2b remainder sent", r2.ok, { status: r2.status, amt: remainderAmount });

    // ----- Assertions -----
    const { data: debtRows } = await supabase.from("tenant_debts")
      .select("*").eq("tenant_id", tenant.id).eq("month_year", monthYear);
    push("only ONE debt row for month (no duplicates)",
      (debtRows?.length ?? 0) === 1, { count: debtRows?.length });

    const debt2 = debtRows?.[0];
    push("debt fully closed (total_owed=0, status=paid)",
      !!debt2 && Number(debt2.total_owed) === 0 && debt2.status === "paid", debt2);

    push("penalty NOT double-recorded (penalty_amount unchanged)",
      Number(debt2?.penalty_amount ?? -1) === penaltyAmount,
      { penalty_amount: debt2?.penalty_amount });

    push("amount_paid equals rent+penalty",
      Number(debt2?.amount_paid ?? 0) === rentAmount + penaltyAmount,
      { amount_paid: debt2?.amount_paid });

    const { data: invAfter } = await supabase.from("invoices")
      .select("status").eq("id", invoice.id).maybeSingle();
    push("invoice marked paid", invAfter?.status === "paid", invAfter);

    const { data: tenAfter2 } = await supabase.from("tenants")
      .select("rent_status").eq("id", tenant.id).maybeSingle();
    push("tenant.rent_status=paid", tenAfter2?.rent_status === "paid", tenAfter2);

    const { data: pays } = await supabase.from("payments")
      .select("id, amount").eq("tenant_id", tenant.id);
    push("exactly 2 payments recorded", (pays?.length ?? 0) === 2,
      { count: pays?.length, sum: pays?.reduce((s,p)=>s+Number(p.amount),0) });
  } catch (e) {
    push("error during test", false, String(e));
  } finally {
    // ----- Cleanup -----
    const tenantIds = cleanupIds.tenant;
    if (tenantIds.length) {
      await supabase.from("commission_ledger").delete().in("payment_id",
        ((await supabase.from("payments").select("id").in("tenant_id", tenantIds)).data ?? []).map(p=>p.id));
      await supabase.from("receipts").delete().in("payment_id",
        ((await supabase.from("payments").select("id").in("tenant_id", tenantIds)).data ?? []).map(p=>p.id));
      await supabase.from("payments").delete().in("tenant_id", tenantIds);
      await supabase.from("tenant_debts").delete().in("tenant_id", tenantIds);
      await supabase.from("invoices").delete().in("tenant_id", tenantIds);
      await supabase.from("tenants").delete().in("id", tenantIds);
    }
    if (cleanupIds.mpesa_settings.length)
      await supabase.from("mpesa_settings").delete().in("id", cleanupIds.mpesa_settings);
    if (cleanupIds.property.length)
      await supabase.from("properties").delete().in("id", cleanupIds.property);
    push("cleanup", true);
  }

  const allOk = steps.every((s) => s.ok);
  return json({ ok: allOk, steps }, allOk ? 200 : 500);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
