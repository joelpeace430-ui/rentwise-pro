import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, Building2, Users, FileText, Calendar, AlertCircle,
  Bell, Smartphone, Coins, Receipt as ReceiptIcon, ArrowLeft,
  Play, Pause, RotateCcw, Sparkles, CheckCircle2, TrendingUp,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

type Tenant = {
  id: string;
  name: string;
  initials: string;
  unit: string;
  property: string;
  phone: string;
  rent: number;
  paid: number;
  penalty: number;
  dueInDays: number; // negative = overdue
  status: "pending" | "partial" | "paid" | "overdue";
  lastPayment?: string;
};

type PaymentRow = {
  id: string;
  tenant: string;
  initials: string;
  property: string;
  amount: number;
  method: "M-Pesa Paybill" | "M-Pesa Till" | "Bank" | "Cash";
  date: string;
  ref: string;
  isNew?: boolean;
};

type Notif = {
  id: string;
  icon: any;
  title: string;
  body: string;
  tone: "emerald" | "amber" | "rose" | "sky";
  time: string;
};

const INITIAL_TENANTS: Tenant[] = [
  { id: "t1", name: "Mary Njoroge", initials: "MN", unit: "A-02", property: "Mumbi Est · Block A", phone: "2547•••4149", rent: 12000, paid: 0, penalty: 0, dueInDays: -2, status: "overdue" },
  { id: "t2", name: "John Kamau", initials: "JK", unit: "A-03", property: "Mumbi Est · Block A", phone: "2547•••2210", rent: 15000, paid: 15000, penalty: 0, dueInDays: 12, status: "paid", lastPayment: "2 days ago" },
  { id: "t3", name: "Susan Achieng", initials: "SA", unit: "A-05", property: "Mumbi Est · Block A", phone: "2547•••8830", rent: 10000, paid: 5000, penalty: 0, dueInDays: 1, status: "partial", lastPayment: "5 days ago" },
  { id: "t4", name: "Peter Mwangi", initials: "PM", unit: "B-01", property: "Mumbi Est · Block B", phone: "2547•••5521", rent: 18000, paid: 18000, penalty: 0, dueInDays: 20, status: "paid", lastPayment: "yesterday" },
  { id: "t5", name: "Grace Wambui", initials: "GW", unit: "B-04", property: "Mumbi Est · Block B", phone: "2547•••7702", rent: 14000, paid: 0, penalty: 0, dueInDays: 3, status: "pending" },
];

const AGENT_RATE = 5;
const CARETAKER_RATE = 2;

// scripted "live" events, spaced in ms from start
type Event =
  | { at: number; kind: "payment"; tenantId: string; amount: number; method: PaymentRow["method"] }
  | { at: number; kind: "penalty"; tenantId: string; amount: number }
  | { at: number; kind: "receipt"; tenantId: string }
  | { at: number; kind: "reminder"; tenantId: string };

const SCRIPT: Event[] = [
  { at: 1500, kind: "payment", tenantId: "t5", amount: 14000, method: "M-Pesa Paybill" },
  { at: 3200, kind: "receipt", tenantId: "t5" },
  { at: 4500, kind: "penalty", tenantId: "t1", amount: 600 },
  { at: 5200, kind: "reminder", tenantId: "t1" },
  { at: 6800, kind: "payment", tenantId: "t1", amount: 6000, method: "M-Pesa Till" },
  { at: 9000, kind: "payment", tenantId: "t3", amount: 5000, method: "M-Pesa Paybill" },
  { at: 10500, kind: "receipt", tenantId: "t3" },
  { at: 12500, kind: "payment", tenantId: "t1", amount: 6600, method: "M-Pesa Paybill" },
  { at: 14000, kind: "receipt", tenantId: "t1" },
];

const TOTAL_MS = 16000;

export default function Demo() {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [toast, setToast] = useState<Notif | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..100
  const startRef = useRef<number>(0);
  const firedRef = useRef<Set<number>>(new Set());
  const rafRef = useRef<number | null>(null);

  const reset = () => {
    setPlaying(false);
    setTenants(INITIAL_TENANTS);
    setPayments([]);
    setNotifs([]);
    setToast(null);
    setProgress(0);
    firedRef.current = new Set();
  };

  const pushToast = (n: Notif) => {
    setToast(n);
    setNotifs((prev) => [n, ...prev].slice(0, 8));
    window.setTimeout(() => setToast((cur) => (cur?.id === n.id ? null : cur)), 3200);
  };

  const applyEvent = (ev: Event) => {
    const t = tenants.find((x) => x.id === ev.tenantId);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (ev.kind === "payment" && t) {
      setTenants((prev) =>
        prev.map((x) => {
          if (x.id !== ev.tenantId) return x;
          const newPaid = x.paid + ev.amount;
          const owed = x.rent + x.penalty - newPaid;
          const status: Tenant["status"] = owed <= 0 ? "paid" : newPaid > 0 ? "partial" : x.status;
          return { ...x, paid: newPaid, status, lastPayment: "just now", penalty: owed <= 0 ? 0 : x.penalty };
        })
      );
      const row: PaymentRow = {
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tenant: t.name,
        initials: t.initials,
        property: `${t.property} · Unit ${t.unit}`,
        amount: ev.amount,
        method: ev.method,
        date: timeStr,
        ref: "M" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        isNew: true,
      };
      setPayments((prev) => [row, ...prev].slice(0, 8));
      window.setTimeout(() => {
        setPayments((prev) => prev.map((p) => (p.id === row.id ? { ...p, isNew: false } : p)));
      }, 1200);
      pushToast({
        id: row.id,
        icon: Smartphone,
        title: `${ev.method} received`,
        body: `${t.name} paid ${fmt(ev.amount)} · matched to unit ${t.unit}`,
        tone: "emerald",
        time: timeStr,
      });
    }

    if (ev.kind === "penalty" && t) {
      setTenants((prev) =>
        prev.map((x) =>
          x.id === ev.tenantId ? { ...x, penalty: x.penalty + ev.amount, status: "overdue" } : x
        )
      );
      pushToast({
        id: `pen_${Date.now()}`,
        icon: AlertCircle,
        title: "Penalty applied",
        body: `${t.name} · ${fmt(ev.amount)} added to balance (5% of overdue)`,
        tone: "rose",
        time: timeStr,
      });
    }

    if (ev.kind === "receipt" && t) {
      pushToast({
        id: `rc_${Date.now()}`,
        icon: ReceiptIcon,
        title: "Receipt emailed",
        body: `Sent to ${t.name} · commissions posted to ledger`,
        tone: "sky",
        time: timeStr,
      });
    }

    if (ev.kind === "reminder" && t) {
      pushToast({
        id: `rm_${Date.now()}`,
        icon: Bell,
        title: "SMS reminder sent",
        body: `${t.name} · balance overdue`,
        tone: "amber",
        time: timeStr,
      });
    }
  };

  // playback loop
  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now() - (progress / 100) * TOTAL_MS;
    const loop = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / TOTAL_MS) * 100);
      setProgress(pct);
      SCRIPT.forEach((ev, i) => {
        if (elapsed >= ev.at && !firedRef.current.has(i)) {
          firedRef.current.add(i);
          applyEvent(ev);
        }
      });
      if (elapsed >= TOTAL_MS) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // derived stats
  const stats = useMemo(() => {
    const totalRevenue = tenants.reduce((s, t) => s + t.paid, 0);
    const outstanding = tenants.reduce((s, t) => s + Math.max(0, t.rent + t.penalty - t.paid), 0);
    const paidCount = tenants.filter((t) => t.status === "paid").length;
    const partialCount = tenants.filter((t) => t.status === "partial").length;
    const overdueCount = tenants.filter((t) => t.status === "overdue").length;
    const pendingCount = tenants.filter((t) => t.status === "pending").length;
    const commissionAgent = totalRevenue * (AGENT_RATE / 100);
    const commissionCare = totalRevenue * (CARETAKER_RATE / 100);
    const landlordNet = totalRevenue - commissionAgent - commissionCare;
    return {
      totalRevenue,
      outstanding,
      paidCount,
      partialCount,
      overdueCount,
      pendingCount,
      commissionAgent,
      commissionCare,
      landlordNet,
    };
  }, [tenants]);

  const overdue = tenants.filter((t) => t.status === "overdue" || t.status === "partial");
  const upcoming = tenants.filter((t) => t.status === "pending" || t.status === "paid").slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Sticky demo control bar */}
      <div className="sticky top-0 z-30 border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Live demo · dummy data</span>
            {playing && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 ml-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE
              </span>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setPlaying((p) => !p)} className="gap-2">
              {playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {progress > 0 && progress < 100 ? "Resume" : "Start live demo"}</>}
            </Button>
            <Button size="sm" variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-0.5 rounded-none" />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-40 w-80 animate-in slide-in-from-right-4 fade-in duration-300">
          <Card className={`shadow-xl border-l-4 ${
            toast.tone === "emerald" ? "border-l-emerald-500" :
            toast.tone === "rose" ? "border-l-rose-500" :
            toast.tone === "amber" ? "border-l-amber-500" : "border-l-sky-500"
          }`}>
            <CardContent className="p-3 flex gap-3">
              <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${
                toast.tone === "emerald" ? "bg-emerald-100 text-emerald-600" :
                toast.tone === "rose" ? "bg-rose-100 text-rose-600" :
                toast.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600"
              }`}>
                <toast.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{toast.title}</div>
                <div className="text-xs text-muted-foreground truncate">{toast.body}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Mumbi Est · Landlord: Joel Thayu · Watch the system react to live tenant payments.</p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={fmt(stats.totalRevenue)} icon={DollarSign} variant="accent" />
          <StatCard title="Outstanding" value={fmt(stats.outstanding)} icon={AlertCircle} />
          <StatCard title="Active Tenants" value={String(tenants.length)} icon={Users} />
          <StatCard title="Properties" value="2" icon={Building2} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Payments feed */}
          <Card className="shadow-md lg:col-span-2">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Recent Payments
              </CardTitle>
              {playing && <Badge variant="secondary" className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />streaming</Badge>}
            </CardHeader>
            <CardContent className="space-y-3">
              {payments.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Press <span className="font-medium">Start live demo</span> to watch payments stream in.
                </div>
              ) : (
                payments.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between py-2 border-b border-border last:border-0 transition-all duration-500 ${
                      p.isNew ? "bg-emerald-50/60 dark:bg-emerald-950/20 -mx-3 px-3 rounded-lg" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {p.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{p.tenant}</p>
                        <p className="text-xs text-muted-foreground">{p.property}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{p.method} · Ref {p.ref}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">+{fmt(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{p.date}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" /> Live activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifs.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">No activity yet</div>
              ) : (
                notifs.map((n) => (
                  <div key={n.id} className="flex gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                    <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                      n.tone === "emerald" ? "bg-emerald-100 text-emerald-600" :
                      n.tone === "rose" ? "bg-rose-100 text-rose-600" :
                      n.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600"
                    }`}>
                      <n.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tenants ledger + commissions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-md lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" /> Tenant ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left font-medium py-2">Tenant</th>
                      <th className="text-right font-medium py-2">Rent</th>
                      <th className="text-right font-medium py-2">Paid</th>
                      <th className="text-right font-medium py-2">Balance</th>
                      <th className="text-right font-medium py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => {
                      const bal = Math.max(0, t.rent + t.penalty - t.paid);
                      return (
                        <tr key={t.id} className="border-b border-border last:border-0 transition-colors">
                          <td className="py-3">
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-muted-foreground">{t.property} · Unit {t.unit}</div>
                          </td>
                          <td className="text-right">{fmt(t.rent)}</td>
                          <td className="text-right text-emerald-600 font-medium">{fmt(t.paid)}</td>
                          <td className="text-right">
                            <span className={bal > 0 ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                              {fmt(bal)}
                            </span>
                            {t.penalty > 0 && (
                              <div className="text-[10px] text-rose-500">incl. {fmt(t.penalty)} penalty</div>
                            )}
                          </td>
                          <td className="text-right">
                            <Badge
                              variant={t.status === "paid" ? "default" : t.status === "partial" ? "secondary" : "outline"}
                              className={
                                t.status === "overdue" ? "border-rose-300 text-rose-600" :
                                t.status === "paid" ? "bg-emerald-600 hover:bg-emerald-600" : ""
                              }
                            >
                              {t.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Commissions & landlord net */}
          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Coins className="h-4 w-4" /> Commissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Agent · Grace Wanjiru ({AGENT_RATE}%)</div>
                  <div className="text-xl font-bold text-emerald-600 tabular-nums">{fmt(stats.commissionAgent)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">auto-posted per payment</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Caretaker · Peter Otieno ({CARETAKER_RATE}%)</div>
                  <div className="text-xl font-bold text-emerald-600 tabular-nums">{fmt(stats.commissionCare)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">auto-posted per payment</div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Landlord net
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums text-emerald-600">
                  {fmt(Math.max(0, stats.landlordNet))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">after commissions</div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Ready for month-end report
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment schedule */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Payment schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Needs attention ({overdue.length})</span>
                </div>
                <div className="space-y-2">
                  {overdue.map((t) => {
                    const bal = Math.max(0, t.rent + t.penalty - t.paid);
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.property} · Unit {t.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{fmt(bal)}</p>
                          <p className="text-xs text-destructive">
                            {t.status === "overdue" ? `${Math.abs(t.dueInDays)} days overdue` : "partially paid"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Upcoming</span>
                </div>
                <div className="space-y-2">
                  {upcoming.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.property} · Unit {t.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmt(t.rent)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.status === "paid" ? `paid ${t.lastPayment}` : `due in ${t.dueInDays} days`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground pt-2 pb-6">
          This is a live simulation using dummy data — your real database is untouched.
        </div>
      </div>
    </div>
  );
}
