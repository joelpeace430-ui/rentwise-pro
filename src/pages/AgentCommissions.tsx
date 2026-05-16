import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, Coins, Briefcase, User, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";

interface Entry {
  id: string;
  property_id: string;
  landlord_user_id: string;
  payment_id: string;
  payment_amount: number;
  commission_amount: number;
  commission_type: string;
  commission_rate: number;
  status: "pending" | "paid";
  created_at: string;
  property_name?: string;
  landlord_name?: string;
  tenant_name?: string;
  tenant_id?: string;
}

const sum = (arr: Entry[]) => arr.reduce((s, e) => s + Number(e.commission_amount || 0), 0);

const AgentCommissions = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("commission_ledger" as any)
        .select("*")
        .eq("recipient_type", "agent")
        .eq("recipient_user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data || []) as any as Entry[];
      const propIds = Array.from(new Set(list.map(e => e.property_id))).filter(Boolean);
      const llIds = Array.from(new Set(list.map(e => e.landlord_user_id))).filter(Boolean);
      const payIds = Array.from(new Set(list.map(e => e.payment_id))).filter(Boolean);

      const [{ data: props }, { data: profs }, { data: mlls }, { data: pays }] = await Promise.all([
        propIds.length ? supabase.from("properties").select("id, name, managed_landlord_id").in("id", propIds) : Promise.resolve({ data: [] } as any),
        llIds.length ? supabase.from("profiles").select("user_id, email, first_name, last_name").in("user_id", llIds) : Promise.resolve({ data: [] } as any),
        propIds.length ? supabase.from("managed_landlords" as any).select("id, first_name, last_name, business_name").eq("agent_user_id", user.id) : Promise.resolve({ data: [] } as any),
        payIds.length ? supabase.from("payments").select("id, tenant_id").in("id", payIds) : Promise.resolve({ data: [] } as any),
      ]);

      const propMap = Object.fromEntries((props || []).map((p: any) => [p.id, p]));
      const profMap = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p]));
      const mllMap = Object.fromEntries(((mlls as any[]) || []).map((m: any) => [m.id, m]));
      const payMap = Object.fromEntries((pays || []).map((p: any) => [p.id, p]));

      const tenantIds = Array.from(new Set(Object.values(payMap).map((p: any) => p.tenant_id))).filter(Boolean);
      const { data: tens } = tenantIds.length
        ? await supabase.from("tenants").select("id, first_name, last_name, unit_number").in("id", tenantIds as string[])
        : { data: [] } as any;
      const tenMap = Object.fromEntries((tens || []).map((t: any) => [t.id, t]));

      setEntries(list.map(e => {
        const prop = propMap[e.property_id];
        const ml = prop?.managed_landlord_id ? mllMap[prop.managed_landlord_id] : null;
        const profile = profMap[e.landlord_user_id];
        const landlordName = ml
          ? [ml.first_name, ml.last_name].filter(Boolean).join(" ") || ml.business_name || "—"
          : (profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email : "—");
        const pay = payMap[e.payment_id];
        const ten = pay ? tenMap[pay.tenant_id] : null;
        return {
          ...e,
          property_name: prop?.name || "—",
          landlord_name: landlordName,
          tenant_id: pay?.tenant_id,
          tenant_name: ten ? `${ten.first_name} ${ten.last_name} · Unit ${ten.unit_number}` : "—",
        };
      }));
      setLoading(false);
    };
    load();
  }, [user]);

  const totalPending = sum(entries.filter(e => e.status === "pending"));
  const totalPaid = sum(entries.filter(e => e.status === "paid"));

  const byLandlord = useMemo(() => {
    const m = new Map<string, { name: string; entries: Entry[] }>();
    entries.forEach(e => {
      const key = e.landlord_name || "—";
      if (!m.has(key)) m.set(key, { name: key, entries: [] });
      m.get(key)!.entries.push(e);
    });
    return Array.from(m.values()).sort((a, b) => sum(b.entries) - sum(a.entries));
  }, [entries]);

  const byTenant = useMemo(() => {
    const m = new Map<string, { name: string; entries: Entry[] }>();
    entries.forEach(e => {
      const key = e.tenant_id || e.tenant_name || "—";
      if (!m.has(key)) m.set(key, { name: e.tenant_name || "—", entries: [] });
      m.get(key)!.entries.push(e);
    });
    return Array.from(m.values()).sort((a, b) => sum(b.entries) - sum(a.entries));
  }, [entries]);

  const renderRow = (e: Entry) => (
    <div key={e.id} className="flex items-center justify-between gap-4 py-3 px-4">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{e.property_name}</p>
        <p className="text-xs text-muted-foreground truncate">{e.tenant_name} · {e.commission_type === "fixed" ? "Fixed" : `${e.commission_rate}%`} of {formatCurrency(e.payment_amount)}</p>
        <p className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString("en-KE")}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold">{formatCurrency(Number(e.commission_amount))}</p>
        <Badge variant={e.status === "paid" ? "default" : "secondary"} className="mt-1">{e.status}</Badge>
      </div>
    </div>
  );

  const renderGroup = (g: { name: string; entries: Entry[] }, icon: React.ReactNode) => {
    const pending = g.entries.filter(e => e.status === "pending");
    const paid = g.entries.filter(e => e.status === "paid");
    return (
      <Card key={g.name} className="glass-card border-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <p className="font-semibold truncate">{g.name}</p>
          </div>
          <div className="flex gap-3 text-right shrink-0">
            <div><p className="text-[11px] text-muted-foreground">Pending</p><p className="text-sm font-semibold text-warning">{formatCurrency(sum(pending))}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Paid</p><p className="text-sm font-semibold text-success">{formatCurrency(sum(paid))}</p></div>
          </div>
        </div>
        <div className="divide-y divide-border/40">{g.entries.map(renderRow)}</div>
      </Card>
    );
  };

  return (
    <DashboardLayout title="My Commissions" subtitle="What you've earned, who owes you, and what's been paid">
      <div className="glass-bg -m-4 sm:-m-6 p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="glass-card border-0"><CardContent className="p-5 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-3xl font-bold mt-1">{formatCurrency(totalPending)}</p></div>
              <div className="h-12 w-12 rounded-2xl bg-warning/15 flex items-center justify-center"><Wallet className="h-6 w-6 text-warning" /></div>
            </CardContent></Card>
            <Card className="glass-card border-0"><CardContent className="p-5 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Paid out</p><p className="text-3xl font-bold mt-1">{formatCurrency(totalPaid)}</p></div>
              <div className="h-12 w-12 rounded-2xl bg-success/15 flex items-center justify-center"><Coins className="h-6 w-6 text-success" /></div>
            </CardContent></Card>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : entries.length === 0 ? (
            <Card className="glass-card border-0"><CardContent className="py-12 text-center text-muted-foreground">
              No commission entries yet. They appear once tenant payments come in.
            </CardContent></Card>
          ) : (
            <Tabs defaultValue="landlord">
              <TabsList className="glass-card border-0">
                <TabsTrigger value="landlord"><Briefcase className="h-4 w-4 mr-1.5" />By landlord</TabsTrigger>
                <TabsTrigger value="tenant"><User className="h-4 w-4 mr-1.5" />By tenant</TabsTrigger>
                <TabsTrigger value="all"><Building2 className="h-4 w-4 mr-1.5" />All entries</TabsTrigger>
              </TabsList>
              <TabsContent value="landlord" className="space-y-4 mt-4">
                {byLandlord.map(g => renderGroup(g, <Briefcase className="h-4 w-4 text-primary shrink-0" />))}
              </TabsContent>
              <TabsContent value="tenant" className="space-y-4 mt-4">
                {byTenant.map(g => renderGroup(g, <User className="h-4 w-4 text-primary shrink-0" />))}
              </TabsContent>
              <TabsContent value="all" className="mt-4">
                <Card className="glass-card border-0"><CardContent className="p-0 divide-y divide-border/40">
                  {entries.map(renderRow)}
                </CardContent></Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentCommissions;
