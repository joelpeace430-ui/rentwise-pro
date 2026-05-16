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
      <div className="glass-bg -m-4 sm:-m-6 p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Rent Collected</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{formatCurrency(commissionSummary.total)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Your Commission</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{formatCurrency(commissionSummary.earned)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No payments found.</p>
                </div>
              ) : (
                <>
                  {/* Mobile list */}
                  <div className="grid gap-3 sm:hidden">
                    {payments.map((p: any) => (
                      <div key={p.id} className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold truncate">{p.tenant_name}</p>
                          <p className="font-semibold shrink-0">{formatCurrency(Number(p.amount))}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{p.property_name}</p>
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <p className="text-xs text-muted-foreground">{format(new Date(p.payment_date), "MMM d, yyyy")} · {p.payment_method?.replace("_", " ")}</p>
                          <Badge variant={p.status === "completed" ? "default" : "secondary"} className="capitalize shrink-0">{p.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
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
                            <TableCell className="whitespace-nowrap">{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                            <TableCell className="font-medium">{p.tenant_name}</TableCell>
                            <TableCell>{p.property_name}</TableCell>
                            <TableCell>{formatCurrency(Number(p.amount))}</TableCell>
                            <TableCell className="capitalize">{p.payment_method?.replace("_", " ")}</TableCell>
                            <TableCell>
                              <Badge variant={p.status === "completed" ? "default" : "secondary"} className="capitalize">
                                {p.status}
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
      </div>
    </DashboardLayout>
  );
};

export default AgentPayments;
