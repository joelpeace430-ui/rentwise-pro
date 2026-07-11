import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play, Pause, SkipForward, RotateCcw, ArrowLeft,
  Smartphone, CheckCircle2, AlertCircle, Coins, Receipt as ReceiptIcon,
  FileBarChart, Users, Building2, Wallet, Sparkles,
} from "lucide-react";

// ---------- fake demo data ----------
const LANDLORD = { name: "Joel Thayu", property: "Mumbi Estate — Block A" };
const AGENT = { name: "Grace Wanjiru", rate: 5 }; // 5%
const CARETAKER = { name: "Peter Otieno", rate: 2 }; // 2%
const TENANT = { name: "Mary Njoroge", unit: "A-02", phone: "2547•••4149", rent: 1000, penaltyRate: 5 };

const fmt = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

type Step = {
  key: string;
  title: string;
  narration: string;
  icon: any;
  ms: number;
};

const STEPS: Step[] = [
  { key: "setup", title: "Meet the players", narration: "One landlord, one agent, one caretaker, one tenant. Rent is KES 1,000. Agent earns 5% and caretaker earns 2% of every payment.", icon: Users, ms: 4500 },
  { key: "invoice", title: "Invoice is issued", narration: "The system auto-generates April's rent invoice for Mary. Status: Pending.", icon: FileBarChart, ms: 4000 },
  { key: "partial", title: "Tenant pays half via M-Pesa Paybill", narration: "Mary sends KES 600 to the Paybill. Safaricom hits our C2B callback. We match by phone + account, record the payment, and mark the invoice partially paid.", icon: Smartphone, ms: 5500 },
  { key: "penalty", title: "Overdue → penalty applied", narration: "After the due date, the balance of KES 400 attracts a 5% penalty = KES 20. Debt row: total owed KES 420.", icon: AlertCircle, ms: 5000 },
  { key: "topup", title: "Tenant tops up the balance", narration: "Mary pays the remaining KES 420. System recomputes from the sum of payments — no double penalty, debt closes cleanly.", icon: Smartphone, ms: 5000 },
  { key: "commission", title: "Commissions split automatically", narration: "A trigger writes to the commission ledger: agent gets 5% and caretaker 2% of every payment. Landlord keeps the rest.", icon: Coins, ms: 5000 },
  { key: "receipt", title: "Receipt emailed to tenant", narration: "Mary receives an itemised receipt: what she paid, remaining debt (now zero), and any utilities.", icon: ReceiptIcon, ms: 4500 },
  { key: "report", title: "Monthly report to landlord", narration: "On the 1st at 8 AM, Joel receives his monthly report: gross income, commissions paid, and a tenant-by-tenant ledger.", icon: FileBarChart, ms: 5500 },
];

export default function Demo() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tick, setTick] = useState(0); // 0..100 within current step
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const step = STEPS[idx];

  // auto-advance loop
  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now();
    const loop = (now: number) => {
      const pct = Math.min(100, ((now - startRef.current) / step.ms) * 100);
      setTick(pct);
      if (pct >= 100) {
        if (idx < STEPS.length - 1) {
          setIdx((i) => i + 1);
          setTick(0);
        } else {
          setPlaying(false);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, idx, step.ms]);

  const reset = () => { setIdx(0); setTick(0); setPlaying(false); };
  const next = () => { if (idx < STEPS.length - 1) { setIdx(idx + 1); setTick(0); } };
  const prev = () => { if (idx > 0) { setIdx(idx - 1); setTick(0); } };

  // derived state per step so visuals match narration
  const state = useMemo(() => {
    const reached = (k: string) => STEPS.findIndex((s) => s.key === k) <= idx;
    const paid = reached("topup") ? 1020 : reached("partial") ? 600 : 0;
    const penalty = reached("penalty") ? 20 : 0;
    const owed = reached("topup") ? 0 : reached("penalty") ? 420 : reached("partial") ? 400 : 1000;
    const invoiceStatus = reached("topup") ? "Paid" : reached("partial") ? "Partial" : reached("invoice") ? "Pending" : "—";
    const commissions = reached("commission") ? {
      agent: Math.round(1020 * AGENT.rate / 100),
      caretaker: Math.round(1020 * CARETAKER.rate / 100),
    } : { agent: 0, caretaker: 0 };
    const landlordNet = paid - commissions.agent - commissions.caretaker;
    return { paid, penalty, owed, invoiceStatus, commissions, landlordNet, reached };
  }, [idx]);

  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top bar */}
      <div className="border-b bg-white/60 dark:bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Live simulation</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero + controls */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">See how Mumbi Est works</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A full end-to-end walkthrough: invoice → M-Pesa payment → penalty → top-up → commissions → receipt → landlord report. No real data touched.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button size="lg" onClick={() => setPlaying((p) => !p)} className="gap-2">
              {playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {idx === 0 && tick === 0 ? "Start simulation" : "Play"}</>}
            </Button>
            <Button size="lg" variant="outline" onClick={next} disabled={idx >= STEPS.length - 1} className="gap-2">
              <SkipForward className="h-4 w-4" /> Next
            </Button>
            <Button size="lg" variant="ghost" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Restart
            </Button>
          </div>
        </div>

        {/* Progress rail */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {idx + 1} of {STEPS.length}</span>
            <span>{step.title}</span>
          </div>
          <Progress value={((idx + tick / 100) / STEPS.length) * 100} />
          <div className="hidden md:grid grid-cols-8 gap-1 pt-1">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => { setIdx(i); setTick(0); }}
                className={`h-1.5 rounded-full transition-colors ${i < idx ? "bg-primary" : i === idx ? "bg-amber-500" : "bg-muted"}`}
                aria-label={s.title}
              />
            ))}
          </div>
        </div>

        {/* Narration card */}
        <Card className="border-amber-200/60 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <CardContent className="p-6 flex gap-4 items-start">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shrink-0">
              <StepIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold">{step.title}</h2>
                <Badge variant="secondary">{idx + 1}/{STEPS.length}</Badge>
              </div>
              <p className="text-muted-foreground mt-1 leading-relaxed">{step.narration}</p>
            </div>
          </CardContent>
        </Card>

        {/* Live dashboards */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Tenant / Invoice */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Tenant & Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Tenant" value={TENANT.name} />
              <Row label="Unit" value={TENANT.unit} />
              <Row label="Phone" value={TENANT.phone} />
              <Row label="Rent" value={fmt(TENANT.rent)} />
              <div className="pt-2 border-t space-y-2">
                <Row label="Paid" value={<span className="font-semibold text-emerald-600">{fmt(state.paid)}</span>} />
                <Row label="Penalty" value={<span className={state.penalty ? "font-semibold text-rose-600" : ""}>{fmt(state.penalty)}</span>} />
                <Row label="Owed" value={<span className="font-semibold">{fmt(state.owed)}</span>} />
                <Row label="Invoice" value={
                  <Badge variant={state.invoiceStatus === "Paid" ? "default" : state.invoiceStatus === "Partial" ? "secondary" : "outline"}>
                    {state.invoiceStatus}
                  </Badge>
                } />
              </div>
            </CardContent>
          </Card>

          {/* Commissions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4" /> Commission ledger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border p-3 space-y-1">
                <div className="text-xs text-muted-foreground">Agent · {AGENT.name} ({AGENT.rate}%)</div>
                <div className="text-lg font-semibold text-emerald-600">{fmt(state.commissions.agent)}</div>
                <Badge variant={state.commissions.agent ? "secondary" : "outline"} className="text-[10px]">
                  {state.commissions.agent ? "Pending payout" : "—"}
                </Badge>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div className="text-xs text-muted-foreground">Caretaker · {CARETAKER.name} ({CARETAKER.rate}%)</div>
                <div className="text-lg font-semibold text-emerald-600">{fmt(state.commissions.caretaker)}</div>
                <Badge variant={state.commissions.caretaker ? "secondary" : "outline"} className="text-[10px]">
                  {state.commissions.caretaker ? "Pending payout" : "—"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Landlord net */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Landlord · {LANDLORD.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Property" value={LANDLORD.property} />
              <Row label="Gross collected" value={fmt(state.paid)} />
              <Row label="− Agent" value={<span className="text-rose-600">−{fmt(state.commissions.agent)}</span>} />
              <Row label="− Caretaker" value={<span className="text-rose-600">−{fmt(state.commissions.caretaker)}</span>} />
              <div className="pt-2 border-t">
                <Row label="Net take-home" value={<span className="text-lg font-bold text-emerald-600">{fmt(Math.max(0, state.landlordNet))}</span>} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contextual panel per step */}
        {step.key === "partial" || step.key === "topup" ? (
          <MpesaSTKMock amount={step.key === "partial" ? 600 : 420} phone={TENANT.phone} />
        ) : step.key === "receipt" ? (
          <ReceiptMock paid={state.paid} penalty={state.penalty} tenant={TENANT.name} />
        ) : step.key === "report" ? (
          <ReportMock net={state.landlordNet} paid={state.paid} agent={state.commissions.agent} caretaker={state.commissions.caretaker} />
        ) : null}

        <div className="text-center text-xs text-muted-foreground pt-4">
          This simulation uses fake data. Your real database is untouched.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function MpesaSTKMock({ amount, phone }: { amount: number; phone: string }) {
  return (
    <Card className="border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-950/20">
      <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="w-64 rounded-2xl bg-slate-900 text-white p-4 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <div className="relative">
            <div className="text-xs opacity-70">M-PESA</div>
            <div className="mt-2 text-xs">Pay Bill</div>
            <div className="text-lg font-semibold">174379</div>
            <div className="mt-2 text-xs">Account · {TENANT.unit}</div>
            <div className="text-xs opacity-70">Amount</div>
            <div className="text-2xl font-bold">{fmt(amount)}</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Sending to {phone}
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-sm">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Safaricom C2B callback received</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Matched to {TENANT.name} (unit {TENANT.unit})</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Payment row inserted · trigger fired</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Invoice + debt recomputed from sum of payments</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReceiptMock({ paid, penalty, tenant }: { paid: number; penalty: number; tenant: string }) {
  return (
    <Card className="border-slate-300/60">
      <CardContent className="p-6">
        <div className="max-w-md mx-auto border rounded-lg p-6 bg-white dark:bg-slate-950 shadow-sm space-y-3">
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Payment Receipt</div>
            <div className="font-semibold text-lg">Mumbi Est</div>
          </div>
          <div className="border-t pt-3 text-sm space-y-1.5">
            <Row label="Tenant" value={tenant} />
            <Row label="Reference" value="MPX7A2Q9L" />
            <Row label="Rent" value={fmt(1000)} />
            <Row label="Penalty" value={fmt(penalty)} />
            <div className="border-t pt-2">
              <Row label="Total paid" value={<span className="font-bold">{fmt(paid)}</span>} />
              <Row label="Balance" value={<span className="text-emerald-600 font-semibold">{fmt(0)}</span>} />
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground pt-2">Emailed & SMS sent to tenant</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportMock({ net, paid, agent, caretaker }: { net: number; paid: number; agent: number; caretaker: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Monthly report preview — {LANDLORD.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
        <Stat label="Gross income" value={fmt(paid)} />
        <Stat label="Agent commissions" value={fmt(agent)} tone="rose" />
        <Stat label="Caretaker commissions" value={fmt(caretaker)} tone="rose" />
        <Stat label="Net take-home" value={fmt(Math.max(0, net))} tone="emerald" />
        <div className="md:col-span-4 border-t pt-3">
          <div className="text-xs text-muted-foreground mb-2">Tenant ledger</div>
          <div className="rounded border divide-y">
            <LedgerRow name={TENANT.name} unit={TENANT.unit} expected={1000} paid={paid} status="Paid" />
            <LedgerRow name="John Kamau" unit="A-03" expected={1200} paid={1200} status="Paid" />
            <LedgerRow name="Susan Achieng" unit="A-05" expected={1000} paid={500} status="Partial" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : "";
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function LedgerRow({ name, unit, expected, paid, status }: { name: string; unit: string; expected: number; paid: number; status: string }) {
  const bal = expected - paid;
  return (
    <div className="grid grid-cols-5 gap-2 px-3 py-2 text-sm items-center">
      <div className="col-span-2">
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">Unit {unit}</div>
      </div>
      <div>{fmt(expected)}</div>
      <div className="text-emerald-600">{fmt(paid)}</div>
      <div className="flex items-center justify-between">
        <span className={bal > 0 ? "text-rose-600" : ""}>{fmt(bal)}</span>
        <Badge variant={status === "Paid" ? "default" : "secondary"} className="text-[10px]">{status}</Badge>
      </div>
    </div>
  );
}
