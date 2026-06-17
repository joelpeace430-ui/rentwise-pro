// Automated end-to-end test:
//   Seeds N tenants (default 4) on one property, sends M-Pesa C2B payments
//   in PARALLEL with different amounts (full, partial, partial+penalty, overpay).
//   Verifies each tenant's payments, invoices, and tenant_debts row remain
//   isolated and accurate — no cross-tenant contamination.
//
// Trigger:
//   POST /functions/v1/test-mpesa-group-isolation
//   { "landlord_user_id": "<uuid>", "tenant_count": 4 }

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

  let landlordId: string | null = null;
  let tenantCount = 4;
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    landlordId = body?.landlord_user_id ?? null;
    if (typeof body?.tenant_count === "number") {
      tenantCount = Math.max(2, Math.min(10, body.tenant_count));
    }
  } catch (_) { /* noop */ }
  if (!landlordId) {
    const { data } = await supabase
      .from("user_roles").select("user_id").eq("role", "landlord").limit(1).maybeSingle();
    landlordId = data?.user_id ?? null;
  }
  if (!landlordId) return json({ ok: false, error: "no landlord user available" }, 400);

  const tag = `GRP-${Date.now()}`;
  const monthYear = new Date().toISOString().slice(0, 7);
  const dueDate = `${monthYear}-01`;
  const shortcode = `T${Math.floor(Math.random() * 1e6)}`;
  const secret = crypto.randomUUID().replace(/-/g, "");

  // Per-tenant scenarios. expectedPaid is what the c2b sends.
  // expectedDebtRemaining is rent + penaltyLocked - paid (clamped to 0).
  type Scenario = {
    label: string; rent: number; paid: number;
    penaltyLocked: number; // locked BEFORE the c2b
    expectFinalStatus: "paid" | "partial" | "overdue";
  };
  const baseScenarios: Scenario[] = [
    { label: "full",     rent: 1000, paid: 1000, penaltyLocked: 0,  expectFinalStatus: "paid" },
    { label: "partial",  rent: 1500, paid: 800,  penaltyLocked: 0,  expectFinalStatus: "partial" },
    { label: "penalty",  rent: 1200, paid: 700,  penaltyLocked: 100, expectFinalStatus: "overdue" },
    { label: "overpay",  rent: 900,  paid: 1000, penaltyLocked: 0,  expectFinalStatus: "paid" },
  ];
  const scenarios = Array.from({ length: tenantCount },
    (_, i) => baseScenarios[i % baseScenarios.length]);

  const cleanupIds = { property: [] as string[], tenant: [] as string[], mpesa_settings: [] as string[] };
  type Seed = {
    scenario: Scenario; tenantId: string; invoiceId: string;
    unit: string; phone: string; transId: string;
  };
  const seeds: Seed[] = [];

  try {
    // ---- Seed property + mpesa_settings ----
    const { data: prop, error: propErr } = await supabase.from("properties").insert({
      user_id: landlordId, name: tag, address: "Test", total_units: tenantCount,
      penalty_type: "fixed", penalty_rate: 50,
    } as any).select().single();
    if (propErr) throw propErr;
    cleanupIds.property.push(prop.id);

    const { data: settings, error: setErr } = await supabase.from("mpesa_settings").insert({
      user_id: landlordId, shortcode, callback_secret: secret,
      consumer_key: "test", consumer_secret: "test",
      environment: "sandbox", is_active: true,
    } as any).select().single();
    if (setErr) throw setErr;
    cleanupIds.mpesa_settings.push(settings.id);

    // ---- Seed tenants + invoices ----
    for (let i = 0; i < scenarios.length; i++) {
      const sc = scenarios[i];
      const unit = `${tag}-U${i + 1}`;
      const phone = `2547${Math.floor(1e8 + Math.random() * 9e8)}`;

      const { data: tenant, error: tenErr } = await supabase.from("tenants").insert({
        user_id: landlordId, property_id: prop.id,
        first_name: `T${i + 1}`, last_name: tag, email: `${tag}-${i}@test.local`,
        phone, unit_number: unit, monthly_rent: sc.rent,
        lease_start: dueDate,
        lease_end: `${Number(monthYear.slice(0,4)) + 1}-${monthYear.slice(5)}-01`,
        rent_status: "pending",
      } as any).select().single();
      if (tenErr) throw tenErr;
      cleanupIds.tenant.push(tenant.id);

      const { data: invoice, error: invErr } = await supabase.from("invoices").insert({
        user_id: landlordId, tenant_id: tenant.id,
        invoice_number: `INV-${tag}-${i}`, amount: sc.rent,
        due_date: dueDate, status: "pending",
      } as any).select().single();
      if (invErr) throw invErr;

      // Pre-lock penalty if scenario requires (simulate calculate-penalties already ran).
      if (sc.penaltyLocked > 0) {
        const { error: dErr } = await supabase.from("tenant_debts").insert({
          user_id: landlordId, tenant_id: tenant.id, property_id: prop.id,
          month_year: monthYear, due_date: dueDate,
          rent_amount: sc.rent, amount_paid: 0,
          penalty_amount: sc.penaltyLocked,
          penalty_applied_at: new Date().toISOString(),
          total_owed: sc.rent + sc.penaltyLocked,
          status: "overdue",
        } as any);
        if (dErr) throw dErr;
      }

      seeds.push({
        scenario: sc, tenantId: tenant.id, invoiceId: invoice.id,
        unit, phone, transId: `${tag}-T${i + 1}`,
      });
    }
    push("seed", true, { tenants: seeds.length });

    // ---- Send all C2B payments IN PARALLEL ----
    const callbackUrl = `${url}/functions/v1/mpesa-c2b-callback?shortcode=${shortcode}&secret=${secret}`;
    const sendC2B = (s: Seed) =>
      fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TransID: s.transId, TransAmount: String(s.scenario.paid),
          MSISDN: s.phone, BillRefNumber: s.unit,
          TransTime: monthYear.replace("-", "") + "01120000",
        }),
      }).then(async (r) => { await r.text(); return r.status; });

    const statuses = await Promise.all(seeds.map(sendC2B));
    push("parallel c2b dispatched",
      statuses.every((s) => s >= 200 && s < 300),
      { statuses });

    // ---- Per-tenant assertions ----
    for (const s of seeds) {
      const { scenario: sc, tenantId, invoiceId } = s;
      const prefix = `[${sc.label} ${tenantId.slice(0, 8)}]`;
      const fullyPaid = sc.paid >= sc.rent + sc.penaltyLocked;

      // Payments isolation: exactly 1 payment for this tenant, with our TransID in notes.
      const { data: pays } = await supabase.from("payments")
        .select("id, amount, notes").eq("tenant_id", tenantId);
      push(`${prefix} exactly 1 payment recorded`,
        (pays?.length ?? 0) === 1 &&
          Number(pays?.[0]?.amount) === sc.paid &&
          String(pays?.[0]?.notes ?? "").includes(s.transId),
        pays);

      // Debt row: 0 when fully paid (no debt persisted), exactly 1 otherwise.
      const { data: debts } = await supabase.from("tenant_debts")
        .select("*").eq("tenant_id", tenantId).eq("month_year", monthYear);
      const expectedDebtRows = fullyPaid && sc.penaltyLocked === 0 ? 0 : 1;
      push(`${prefix} debt rows = ${expectedDebtRows}`,
        (debts?.length ?? 0) === expectedDebtRows, { count: debts?.length });

      if (expectedDebtRows === 1) {
        const debt = debts?.[0];
        const expectedOwed = Math.max(0, sc.rent + sc.penaltyLocked - sc.paid);
        push(`${prefix} debt.total_owed correct`,
          !!debt && Number(debt.total_owed) === expectedOwed,
          { expected: expectedOwed, got: debt?.total_owed });

        push(`${prefix} debt.status=${sc.expectFinalStatus}`,
          debt?.status === sc.expectFinalStatus, { got: debt?.status });

        push(`${prefix} penalty not double-recorded`,
          Number(debt?.penalty_amount ?? 0) === sc.penaltyLocked,
          { expected: sc.penaltyLocked, got: debt?.penalty_amount });
      }

      // Invoice status: paid when rent covered (callback marks paid even if overpay).
      const { data: inv } = await supabase.from("invoices")
        .select("status").eq("id", invoiceId).maybeSingle();
      const expectedInvStatus = fullyPaid ? "paid" : "pending";
      push(`${prefix} invoice.status=${expectedInvStatus}`,
        inv?.status === expectedInvStatus, inv);
    }

    // ---- Global isolation check ----
    const tenantIds = seeds.map((s) => s.tenantId);
    const { data: allPays } = await supabase.from("payments")
      .select("tenant_id").in("tenant_id", tenantIds);
    const byTenant = new Map<string, number>();
    for (const p of allPays ?? []) byTenant.set(p.tenant_id, (byTenant.get(p.tenant_id) ?? 0) + 1);
    push("no cross-tenant payment leakage (1 payment per tenant)",
      tenantIds.every((id) => byTenant.get(id) === 1),
      Object.fromEntries(byTenant));

    const { data: allDebts } = await supabase.from("tenant_debts")
      .select("tenant_id").in("tenant_id", tenantIds).eq("month_year", monthYear);
    const debtByTenant = new Map<string, number>();
    for (const d of allDebts ?? []) debtByTenant.set(d.tenant_id, (debtByTenant.get(d.tenant_id) ?? 0) + 1);
    push("no duplicate debt rows across tenants",
      tenantIds.every((id) => debtByTenant.get(id) === 1),
      Object.fromEntries(debtByTenant));
  } catch (e) {
    push("error during test", false, String(e));
  } finally {
    const tenantIds = cleanupIds.tenant;
    if (tenantIds.length) {
      const payIds = ((await supabase.from("payments").select("id").in("tenant_id", tenantIds)).data ?? []).map(p => p.id);
      if (payIds.length) {
        await supabase.from("commission_ledger").delete().in("payment_id", payIds);
        await supabase.from("receipts").delete().in("payment_id", payIds);
      }
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
