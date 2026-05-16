import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const AgentProperties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user) return;
      setLoading(true);

      const { data: commissions } = await supabase
        .from("agent_commissions")
        .select("*, property:properties(id, name, address, total_units, status, user_id)")
        .eq("agent_user_id", user.id);

      if (!commissions || commissions.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }

      const propertyIds = commissions.map((c: any) => c.property_id);

      const [tenantsRes, profilesRes] = await Promise.all([
        supabase.from("tenants").select("id, property_id, monthly_rent, unit_number").in("property_id", propertyIds),
        supabase.from("profiles").select("user_id, email, first_name, last_name"),
      ]);

      const tenants = tenantsRes.data || [];
      const profiles = profilesRes.data || [];

      const props = commissions.map((c: any) => {
        const propTenants = tenants.filter(t => t.property_id === c.property_id);
        const landlordProfile = profiles.find(p => p.user_id === c.landlord_user_id);
        const totalMonthlyRent = propTenants.reduce((sum, t) => sum + Number(t.monthly_rent), 0);

        return {
          id: c.property?.id,
          name: c.property?.name || "Unknown",
          address: c.property?.address || "",
          total_units: c.property?.total_units || 0,
          status: c.property?.status || "active",
          occupied_units: propTenants.length,
          landlord_name: landlordProfile ? `${landlordProfile.first_name || ""} ${landlordProfile.last_name || ""}`.trim() || landlordProfile.email : "Unknown",
          monthly_rent: totalMonthlyRent,
          commission_type: c.commission_type,
          commission_rate: Number(c.commission_rate),
        };
      });

      setProperties(props);
      setLoading(false);
    };

    fetchProperties();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout title="Properties" subtitle="Properties you manage">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Properties" subtitle="Properties assigned to you">
      <div className="glass-bg -m-4 sm:-m-6 p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Managed Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No properties assigned yet.</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="grid gap-3 sm:hidden">
                  {properties.map((prop) => (
                    <div key={prop.id} className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{prop.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{prop.address}</p>
                        </div>
                        <Badge variant={prop.status === "active" ? "default" : "secondary"} className="shrink-0">{prop.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">Landlord: {prop.landlord_name}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">{prop.occupied_units}/{prop.total_units} units</Badge>
                        <Badge variant="outline">{formatCurrency(prop.monthly_rent)}/mo</Badge>
                        <Badge variant="outline">
                          {prop.commission_type === "percentage" ? `${prop.commission_rate}%` : formatCurrency(prop.commission_rate)} comm.
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Landlord</TableHead>
                        <TableHead>Units</TableHead>
                        <TableHead>Occupancy</TableHead>
                        <TableHead>Monthly Rent</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.map((prop) => (
                        <TableRow key={prop.id}>
                          <TableCell className="font-medium">{prop.name}</TableCell>
                          <TableCell className="text-muted-foreground">{prop.address}</TableCell>
                          <TableCell>{prop.landlord_name}</TableCell>
                          <TableCell>{prop.total_units}</TableCell>
                          <TableCell>
                            <Badge variant={prop.occupied_units === prop.total_units ? "default" : "secondary"}>
                              {prop.occupied_units}/{prop.total_units}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(prop.monthly_rent)}</TableCell>
                          <TableCell>
                            {prop.commission_type === "percentage" ? `${prop.commission_rate}%` : formatCurrency(prop.commission_rate)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={prop.status === "active" ? "default" : "secondary"}>
                              {prop.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentProperties;
