import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

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

  if (rolesLoading) return null;
  if (!isAdmin()) return <Navigate to="/" replace />;

  return (
    <DashboardLayout title="Landlords" subtitle="All landlords across the platform">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No landlords yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(r => (
            <Card key={r.user_id}>
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="font-semibold">{[r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "—"}</p>
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
