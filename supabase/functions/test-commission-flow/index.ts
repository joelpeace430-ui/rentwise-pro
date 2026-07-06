// End-to-end test:
//   Seeds landlord, property, agent (%), caretaker (fixed), tenant, invoice,
//   and mpesa_settings, then simulates a full M-Pesa C2B payment. Verifies
//   commission_ledger records both an agent and a caretaker entry with the
//   right amounts, exactly once (no duplicates on re-insert).
//
// Trigger: POST /functions/v1/test-commission-flow
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

  // Pick a landlord (has "landlord" role) and any other user as the "agent".
  const { data: landlordRow } = await supabase
    .from("user_roles").select("user_id").eq("role", "landlord").limit(1).maybeSingle();
  const landlordId = landlordRow?.user_id;
  if (!landlordId) return json({ ok: false, error: "no landlord user available" }, 400);

  const { data: agentRow } = await supabase
    .from("user_roles").select("user_id").eq("role", "agent").limit(1).maybeSingle();
  // Fall back to any other user id; the flow only requires a valid user uuid.
  let agentId = agentRow?.user_id;
  if (!agentId || agentId === landlordId) {
    const { data: any } = await supabase.from("profiles")
      .select("user_id").neq("user_id", landlordId).limit(1).maybeSingle();
    agentId = any?.user_id ?? landlordId; // last-resort: same as landlord (still a valid uuid)
  }

  const tag = `COMM-${Date.now()}`;
  const monthYear = new Date().toISOString().slice(0, 7);
  const dueDate = `${monthYear}-01`;
  const rent = 10000;
  const agentPct = 10;                    // 10% of the payment
  const caretakerFixed = 500;             // flat KSh
  const shortcode = `T${Math.floor(Math.random() * 1e6)}`;
  const secret = crypto.randomUUID().replace(/-/g, "");
  const phone = `2547${Math.floor(1e8 + Math.random() * 9e8)}`;
  const unitNumber = `${tag}-U1`;

  const cleanup: Record<string, string[]> = {
    property: [], tenant: [], invoice: [], mpesa_settings: [], caretaker: [],
    agent_commissions: [], caretaker_assignments: [],
  };

  try {
    const { data: prop, error: propErr } = await supabase.from("properties").insert({
      user_id: landlordId, name: tag, address: "Test", total_units: 1,
    } as any).select().single();
    if (propErr) throw propErr;
    cleanup.property.push(prop.id);

    // Agent assignment (percentage)
    const { data: agentAssign, error: aaErr } = await supabase.from("agent_commissions").insert({
      agent_user_id: agentId, landlord_user_id: landlordId, property_id: prop.id,
      commission_type: "percentage", commission_rate: agentPct,
    } as any).select().single();
    if (aaErr) throw aaErr;
    cleanup.agent_commissions.push(agentAssign.id);

    // Caretaker (with assignment, fixed rate)
    const { data: caretaker, error: ctErr } = await supabase.from("caretakers").insert({
      user_id: landlordId, first_name: "Care", last_name: tag,
      phone: "254700000000", status: "active",
    } as any).select().single();
    if (ctErr) throw ctErr;
    cleanup.caretaker.push(caretaker.id);

    const { data: ctAssign, error: cAErr } = await supabase.from("caretaker_assignments").insert({
      caretaker_id: caretaker.id, landlord_user_id: landlordId, property_id: prop.id,
      commission_type: "fixed", commission_rate: caretakerFixed,
    } as any).select().single();
    if (cAErr) throw cAErr;
    cleanup.caretaker_assignments.push(ctAssign.id);

    const { data: tenant, error: tenErr } = await supabase.from("tenants").insert({
      user_id: landlordId, property_id: prop.id,
      first_name: "Test", last_name: tag, email: `${tag}@test.local`,
      phone, unit_number: unitNumber, monthly_rent: rent,
      lease_start: dueDate, lease_end: `${Number(monthYear.slice(0,4)) + 1}-${monthYear.slice(5)}-01`,
      rent_status: "pending",
    } as any).select().single();
    if (tenErr) throw tenErr;
    cleanup.tenant.push(tenant.id);

    const { data: invoice, error: invErr } = await supabase.from("invoices").insert({
      user_id: landlordId, tenant_id: tenant.id,
      invoice_number: `INV-${tag}`, amount: rent,
      due_date: dueDate, status: "pending",
    } as any).select().single();
    if (invErr) throw invErr;
    cleanup.invoice.push(invoice.id);

    const { data: settings, error: setErr } = await supabase.from("mpesa_settings").insert({
      user_id: landlordId, shortcode, callback_secret: secret,
      consumer_key: "test", consumer_secret: "test",
      environment: "sandbox", is_active: true,
    } as any).select().single();
    if (setErr) throw setErr;
    cleanup.mpesa_settings.push(settings.id);

    push("seed", true, { agent: agentId, caretaker: caretaker.id, tenant: tenant.id });

    // ----- Send M-Pesa C2B for full rent -----
    const callbackUrl = `${url}/functions/v1/mpesa-c2b-callback?shortcode=${shortcode}&secret=${secret}`;
    const r = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TransID: `${tag}-P1`, TransAmount: String(rent),
        MSISDN: phone, BillRefNumber: unitNumber,
        TransTime: monthYear.replace("-", "") + "01120000",
      }),
    });
    await r.text();
    push("c2b payment accepted", r.ok, { status: r.status });

    // Locate the resulting payment
    const { data: pays } = await supabase.from("payments")
      .select("id, amount, status").eq("tenant_id", tenant.id);
    push("exactly 1 payment recorded", (pays?.length ?? 0) === 1 && pays![0].status === "completed",
      { count: pays?.length, status: pays?.[0]?.status });

    const paymentId = pays?.[0]?.id;

    // Commission entries
    const { data: ledger } = await supabase.from("commission_ledger")
      .select("*").eq("payment_id", paymentId!);
    push("2 commission entries created (agent + caretaker)",
      (ledger?.length ?? 0) === 2, { count: ledger?.length });

    const agentEntry = ledger?.find(l => l.recipient_type === "agent");
    push("agent commission recorded",
      !!agentEntry && Number(agentEntry.recipient_user_id === agentId ? 1 : 0) === 1,
      agentEntry);
    push("agent commission amount = 10% of rent (=1000)",
      Number(agentEntry?.commission_amount ?? -1) === rent * agentPct / 100,
      { got: agentEntry?.commission_amount, expected: rent * agentPct / 100 });

    const ctEntry = ledger?.find(l => l.recipient_type === "caretaker");
    push("caretaker commission recorded (with caretaker_id, no recipient_user_id)",
      !!ctEntry && ctEntry.caretaker_id === caretaker.id && ctEntry.recipient_user_id === null,
      ctEntry);
    push("caretaker commission amount = fixed 500",
      Number(ctEntry?.commission_amount ?? -1) === caretakerFixed,
      { got: ctEntry?.commission_amount, expected: caretakerFixed });

    // Idempotency: update the payment's status back to completed and confirm
    // no duplicate ledger rows appear.
    await supabase.from("payments").update({ status: "completed" }).eq("id", paymentId!);
    const { data: ledger2 } = await supabase.from("commission_ledger")
      .select("id").eq("payment_id", paymentId!);
    push("commissions are idempotent (still 2 rows after re-trigger)",
      (ledger2?.length ?? 0) === 2, { count: ledger2?.length });

    // Both entries start in status "pending"
    push("commission entries start as pending",
      ledger?.every(l => l.status === "pending") ?? false,
      { statuses: ledger?.map(l => l.status) });

  } catch (e) {
    push("error during test", false, String(e));
  } finally {
    const tenantIds = cleanup.tenant;
    if (tenantIds.length) {
      const payIds = ((await supabase.from("payments").select("id").in("tenant_id", tenantIds)).data ?? []).map(p=>p.id);
      if (payIds.length) {
        await supabase.from("commission_ledger").delete().in("payment_id", payIds);
        await supabase.from("receipts").delete().in("payment_id", payIds);
      }
      await supabase.from("payments").delete().in("tenant_id", tenantIds);
      await supabase.from("tenant_debts").delete().in("tenant_id", tenantIds);
      await supabase.from("invoices").delete().in("tenant_id", tenantIds);
      await supabase.from("tenants").delete().in("id", tenantIds);
    }
    if (cleanup.caretaker_assignments.length)
      await supabase.from("caretaker_assignments").delete().in("id", cleanup.caretaker_assignments);
    if (cleanup.agent_commissions.length)
      await supabase.from("agent_commissions").delete().in("id", cleanup.agent_commissions);
    if (cleanup.caretaker.length)
      await supabase.from("caretakers").delete().in("id", cleanup.caretaker);
    if (cleanup.mpesa_settings.length)
      await supabase.from("mpesa_settings").delete().in("id", cleanup.mpesa_settings);
    if (cleanup.property.length)
      await supabase.from("properties").delete().in("id", cleanup.property);
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
