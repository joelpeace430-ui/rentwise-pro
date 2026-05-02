import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Users, Wallet, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import AssignmentManager from "@/components/properties/AssignmentManager";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [collected, setCollected] = useState(0);
  const [outstanding, setOutstanding] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const [{ data: p }, { data: ts }, { data: pays }, { data: debts }] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).maybeSingle(),
        supabase.from("tenants").select("*").eq("property_id", id),
        supabase.from("payments").select("amount, status, tenant_id, tenants!inner(property_id)").eq("status", "completed").eq("tenants.property_id", id),
        supabase.from("tenant_debts").select("total_owed, amount_paid, property_id").eq("property_id", id),
      ]);
      setProperty(p);
      setTenants(ts || []);
      setCollected((pays || []).reduce((s: number, x: any) => s + Number(x.amount || 0), 0));
      setOutstanding((debts || []).reduce((s: number, x: any) => s + Math.max(0, Number(x.total_owed || 0) - Number(x.amount_paid || 0)), 0));
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <DashboardLayout title="Property"><div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>
  );

  if (!property) return (
    <DashboardLayout title="Not found"><Card><CardContent className="py-12 text-center">Property not found.</CardContent></Card></DashboardLayout>
  );

  const occupied = tenants.length;
  const occupancy = property.total_units > 0 ? Math.round((occupied / property.total_units) * 100) : 0;

  return (
    <DashboardLayout title={property.name} subtitle={property.address}>
      <div className="space-y-6">
        <Link to="/properties"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Properties</Button></Link>

        {/* Summary */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Units</p><p className="text-2xl font-bold">{property.total_units}</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><Users className="h-5 w-5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground">Occupancy</p><p className="text-2xl font-bold">{occupancy}%</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-accent-foreground" /></div>
              <div><p className="text-xs text-muted-foreground">Collected</p><p className="text-2xl font-bold">{formatCurrency(collected)}</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-2xl font-bold">{formatCurrency(outstanding)}</p></div>
            </div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tenants">Tenants ({tenants.length})</TabsTrigger>
            <TabsTrigger value="staff">Staff & Commissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">Property Details</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{property.name}</span></div>
                <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span>{property.address}</span></div>
                {property.location && <div><span className="text-muted-foreground">Location:</span> <span>{property.location}</span></div>}
                <div><span className="text-muted-foreground">Total units:</span> <span>{property.total_units}</span></div>
                {property.rent_per_unit > 0 && <div><span className="text-muted-foreground">Default rent/unit:</span> <span>{formatCurrency(property.rent_per_unit)}</span></div>}
                <div><span className="text-muted-foreground">Status:</span> <Badge>{property.status}</Badge></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tenants">
            <Card><CardContent className="p-0">
              {tenants.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">No tenants in this property.</div>
              ) : (
                <div className="divide-y">
                  {tenants.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{t.first_name} {t.last_name}</p>
                        <p className="text-xs text-muted-foreground">Unit {t.unit_number} · {t.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(t.monthly_rent)}</p>
                        <Badge variant={t.rent_status === "paid" ? "default" : "secondary"} className="mt-1">{t.rent_status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="staff">
            <AssignmentManager propertyId={property.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PropertyDetail;
