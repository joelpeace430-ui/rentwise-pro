import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const AgentPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [commissionSummary, setCommissionSummary] = useState({ total: 0, earned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;
      setLoading(true);

      const { data: commissions } = await supabase
        .from("agent_commissions")
        .select("property_id, commission_type, commission_rate")
        .eq("agent_user_id", user.id);

      const propertyIds = commissions?.map((c: any) => c.property_id) || [];

      if (propertyIds.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      // Get tenant IDs for assigned properties
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, property_id, property:properties(name)")
        .in("property_id", propertyIds);

      const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]));
      const tenantIds = (tenants || []).map((t: any) => t.id);

      if (tenantIds.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .in("tenant_id", tenantIds)
        .order("payment_date", { ascending: false })
        .limit(50);

      const enriched = (paymentData || []).map((p: any) => {
        const tenant = tenantMap.get(p.tenant_id);
        return {
          ...p,
          tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : "Unknown",
          property_name: tenant?.property?.name || "Unknown",
          property_id: tenant?.property_id,
        };
      });

      // Calculate commissions
      const commissionMap = new Map((commissions || []).map((c: any) => [c.property_id, c]));
      let totalCollected = 0;
      let totalEarned = 0;

      enriched.filter(p => p.status === "completed").forEach((p) => {
        const comm = commissionMap.get(p.property_id);
        totalCollected += Number(p.amount);
        if (comm) {
          if (comm.commission_type === "percentage") {
            totalEarned += Number(p.amount) * (Number(comm.commission_rate) / 100);
          }
        }
      });

      setCommissionSummary({ total: totalCollected, earned: totalEarned });
      setPayments(enriched);
      setLoading(false);
    };

    fetchPayments();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout title="Payments & Financials" subtitle="Loading...">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payments & Financials" subtitle="Track rent payments and commissions">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Rent Collected</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(commissionSummary.total)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Your Commission</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(commissionSummary.earned)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No payments found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-medium">{p.tenant_name}</TableCell>
                        <TableCell>{p.property_name}</TableCell>
                        <TableCell>{formatCurrency(Number(p.amount))}</TableCell>
                        <TableCell className="capitalize">{p.payment_method?.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentPayments;
