import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const rentStatusColors: Record<string, string> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive",
};

const AgentTenants = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      if (!user) return;
      setLoading(true);

      const { data: commissions } = await supabase
        .from("agent_commissions")
        .select("property_id")
        .eq("agent_user_id", user.id);

      const propertyIds = commissions?.map((c: any) => c.property_id) || [];

      if (propertyIds.length === 0) {
        setTenants([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("tenants")
        .select("*, property:properties(name)")
        .in("property_id", propertyIds)
        .order("first_name");

      setTenants(data || []);
      setLoading(false);
    };

    fetchTenants();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout title="Tenants" subtitle="Loading...">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tenants" subtitle="Tenants in your managed properties">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tenants found in your assigned properties.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Property / Unit</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lease Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant: any) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.first_name} {tenant.last_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{tenant.email}</div>
                        {tenant.phone && <div className="text-xs text-muted-foreground">{tenant.phone}</div>}
                      </TableCell>
                      <TableCell>{tenant.property?.name} - {tenant.unit_number}</TableCell>
                      <TableCell>{formatCurrency(Number(tenant.monthly_rent))}</TableCell>
                      <TableCell>
                        <Badge variant={rentStatusColors[tenant.rent_status] as any || "secondary"}>
                          {tenant.rent_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(tenant.lease_start), "MMM d, yyyy")} - {format(new Date(tenant.lease_end), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AgentTenants;
