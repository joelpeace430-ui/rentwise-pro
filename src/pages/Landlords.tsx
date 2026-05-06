import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, Mail, Phone, ArrowLeft, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LandlordRow {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  business_name: string | null;
  property_count: number;
  tenant_count: number;
}

const Landlords = () => {
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LandlordRow[]>([]);
  const [selected, setSelected] = useState<LandlordRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: roles } = await supabase
        .from("user_roles").select("user_id").eq("role", "landlord");
      const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
      if (ids.length === 0) { setRows([]); setLoading(false); return; }
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, email, first_name, last_name, phone, business_name").in("user_id", ids);

      const enriched = await Promise.all(ids.map(async (uid) => {
        const p = (profiles || []).find((x: any) => x.user_id === uid) || {} as any;
        const { count: pc } = await supabase
          .from("properties").select("*", { count: "exact", head: true }).eq("user_id", uid);
        const { count: tc } = await supabase
          .from("tenants").select("*", { count: "exact", head: true }).eq("user_id", uid);
        return {
          user_id: uid,
          email: p.email || null,
          first_name: p.first_name || null,
          last_name: p.last_name || null,
          phone: p.phone || null,
          business_name: p.business_name || null,
          property_count: pc || 0,
          tenant_count: tc || 0,
        };
      }));
      setRows(enriched);
      setLoading(false);
    };
    if (!rolesLoading && isAdmin()) load();
  }, [rolesLoading]);

  const openLandlord = async (l: LandlordRow) => {
    setSelected(l);
    setDetailLoading(true);
    const [{ data: props }, { data: tens }] = await Promise.all([
      supabase.from("properties").select("*").eq("user_id", l.user_id).order("created_at", { ascending: false }),
      supabase.from("tenants").select("*").eq("user_id", l.user_id).order("created_at", { ascending: false }),
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


  if (rolesLoading) return null;
  if (!isAdmin()) return <Navigate to="/" replace />;

  const displayName = (l: LandlordRow) =>
    [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || "—";

  if (selected) {
    return (
      <DashboardLayout title={displayName(selected)} subtitle={selected.business_name || "Landlord details"}>
        <div className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to landlords
          </Button>

          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> Properties ({properties.length})
                </h2>
                {properties.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">No properties.</CardContent></Card>
                ) : (
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
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" /> Tenants ({tenants.length})
                </h2>
                {tenants.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">No tenants.</CardContent></Card>
                ) : (
                  <Card>
                    <CardContent className="p-0 divide-y">
                      {tenants.map(t => {
                        const prop = properties.find(p => p.id === t.property_id);
                        return (
                          <div key={t.id} className="flex items-center justify-between gap-4 p-4">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{t.first_name} {t.last_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {prop?.name || "—"} · Unit {t.unit_number} · {t.email}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Last payment: {t._lastPayment ? new Date(t._lastPayment).toLocaleDateString("en-KE") : "—"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-sm font-semibold ${t._balance > 0 ? "text-destructive" : "text-foreground"}`}>
                                KSh {Number(t._balance || 0).toLocaleString("en-KE")}
                              </span>
                              <Badge variant={t.rent_status === "paid" ? "default" : "secondary"}>
                                {t.rent_status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </section>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Landlords" subtitle="All landlords across the platform">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No landlords yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(r => (
            <Card
              key={r.user_id}
              onClick={() => openLandlord(r)}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="font-semibold">{displayName(r)}</p>
                  {r.business_name && <p className="text-xs text-muted-foreground">{r.business_name}</p>}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {r.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{r.email}</div>}
                  {r.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{r.phone}</div>}
                </div>
                <div className="flex gap-2 pt-2">
                  <Badge variant="secondary"><Building2 className="h-3 w-3 mr-1" />{r.property_count} properties</Badge>
                  <Badge variant="outline">{r.tenant_count} tenants</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Landlords;
