import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Building2, Users, Mail, Phone, Briefcase, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";

interface LandlordRow {
  user_id: string; // synthetic id (managed_landlord id or auth user id)
  is_managed: boolean;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  business_name: string | null;
  property_count: number;
  property_ids: string[];
}

const AgentLandlords = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LandlordRow[]>([]);
  const [selected, setSelected] = useState<LandlordRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      // Managed landlords created by this agent
      const { data: managed } = await supabase
        .from("managed_landlords" as any)
        .select("*")
        .eq("agent_user_id", user.id);

      const managedRows: LandlordRow[] = [];
      const managedIds = ((managed as any[]) || []).map((m: any) => m.id);
      let propsByMl: Record<string, string[]> = {};
      if (managedIds.length) {
        const { data: mProps } = await supabase
          .from("properties")
          .select("id, managed_landlord_id")
          .in("managed_landlord_id", managedIds);
        (mProps || []).forEach((p: any) => {
          (propsByMl[p.managed_landlord_id] = propsByMl[p.managed_landlord_id] || []).push(p.id);
        });
      }
      ((managed as any[]) || []).forEach((m: any) => {
        managedRows.push({
          user_id: m.id,
          is_managed: true,
          email: m.email,
          first_name: m.first_name,
          last_name: m.last_name,
          phone: m.phone,
          business_name: m.business_name,
          property_ids: propsByMl[m.id] || [],
          property_count: (propsByMl[m.id] || []).length,
        });
      });

      // Auth-based landlords (legacy: properties assigned to agent via agent_commissions)
      const { data: comms } = await supabase
        .from("agent_commissions")
        .select("landlord_user_id, property_id")
        .eq("agent_user_id", user.id)
        .neq("landlord_user_id", user.id);

      const byLandlord: Record<string, string[]> = {};
      (comms || []).forEach((c: any) => {
        byLandlord[c.landlord_user_id] = byLandlord[c.landlord_user_id] || [];
        byLandlord[c.landlord_user_id].push(c.property_id);
      });
      const ids = Object.keys(byLandlord);
      let authRows: LandlordRow[] = [];
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, first_name, last_name, phone, business_name")
          .in("user_id", ids);
        authRows = ids.map((uid) => {
          const p: any = (profiles || []).find((x: any) => x.user_id === uid) || {};
          return {
            user_id: uid,
            is_managed: false,
            email: p.email || null,
            first_name: p.first_name || null,
            last_name: p.last_name || null,
            phone: p.phone || null,
            business_name: p.business_name || null,
            property_count: byLandlord[uid].length,
            property_ids: byLandlord[uid],
          };
        });
      }

      setRows([...managedRows, ...authRows]);
      setLoading(false);
    };
    load();
  }, [user]);

  const openLandlord = async (l: LandlordRow) => {
    setSelected(l);
    setDetailLoading(true);
    const [{ data: props }, { data: tens }] = await Promise.all([
      supabase.from("properties").select("*").in("id", l.property_ids),
      supabase.from("tenants").select("*").in("property_id", l.property_ids),
    ]);
    const tenantList = tens || [];
    const tenantIds = tenantList.map((t: any) => t.id);
    let debtsByTenant: Record<string, number> = {};
    let lastPayByTenant: Record<string, string> = {};
    if (tenantIds.length) {
      const [{ data: debts }, { data: pays }] = await Promise.all([
        supabase.from("tenant_debts").select("tenant_id, total_owed, amount_paid, status").in("tenant_id", tenantIds),
        supabase.from("payments").select("tenant_id, payment_date").in("tenant_id", tenantIds).eq("status", "completed").order("payment_date", { ascending: false }),
      ]);
      (debts || []).forEach((d: any) => {
        if (d.status === "paid") return;
        const owed = Number(d.total_owed || 0) - Number(d.amount_paid || 0);
        debtsByTenant[d.tenant_id] = (debtsByTenant[d.tenant_id] || 0) + Math.max(0, owed);
      });
      (pays || []).forEach((p: any) => {
        if (!lastPayByTenant[p.tenant_id]) lastPayByTenant[p.tenant_id] = p.payment_date;
      });
    }
    setProperties(props || []);
    setTenants(tenantList.map((t: any) => ({
      ...t,
      _balance: debtsByTenant[t.id] || 0,
      _lastPayment: lastPayByTenant[t.id] || null,
    })));
    setDetailLoading(false);
  };

  const displayName = (l: LandlordRow) =>
    [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || "—";

  if (selected) {
    return (
      <DashboardLayout title={displayName(selected)} subtitle={selected.business_name || "Landlord details"}>
        <div className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Building2 className="h-5 w-5" /> Properties ({properties.length})</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {properties.map(p => {
                    const propTenants = tenants.filter(t => t.property_id === p.id);
                    return (
                      <Card key={p.id}>
                        <CardContent className="p-4 space-y-2">
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.address}</p>
                          <div className="flex gap-2 pt-1">
                            <Badge variant="secondary">{p.total_units} units</Badge>
                            <Badge variant="outline">{propTenants.length} tenants</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users className="h-5 w-5" /> Tenants ({tenants.length})</h2>
                {tenants.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">No tenants.</CardContent></Card>
                ) : (
                  <Card><CardContent className="p-0 divide-y">
                    {tenants.map(t => {
                      const prop = properties.find(p => p.id === t.property_id);
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-4 p-4">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{t.first_name} {t.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{prop?.name || "—"} · Unit {t.unit_number} · {t.email}</p>
                            <p className="text-xs text-muted-foreground mt-1">Last payment: {t._lastPayment ? new Date(t._lastPayment).toLocaleDateString("en-KE") : "—"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-sm font-semibold ${t._balance > 0 ? "text-destructive" : "text-foreground"}`}>
                              {formatCurrency(Number(t._balance || 0))}
                            </span>
                            <Badge variant={t.rent_status === "paid" ? "default" : "secondary"}>{t.rent_status}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent></Card>
                )}
              </section>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Landlords" subtitle="Landlords whose properties you manage">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No landlords yet. You'll see landlords here once you're assigned to their properties.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(r => (
            <Card key={r.user_id} onClick={() => openLandlord(r)} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="font-semibold">{displayName(r)}</p>
                  {r.business_name && <p className="text-xs text-muted-foreground">{r.business_name}</p>}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {r.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{r.email}</div>}
                  {r.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{r.phone}</div>}
                </div>
                <Badge variant="secondary"><Building2 className="h-3 w-3 mr-1" />{r.property_count} properties</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AgentLandlords;
