import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, DollarSign, FileText, Percent, TrendingUp, Loader2 } from "lucide-react";
import { useAgentData } from "@/hooks/useAgentData";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const AgentDashboard = () => {
  const { stats, properties, commissions, loading } = useAgentData();

  if (loading) {
    return (
      <DashboardLayout title="Agent Dashboard" subtitle="Loading...">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Agent Dashboard" subtitle="Overview of your managed properties and earnings.">
      <div className="glass-bg -m-4 sm:-m-6 p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
       <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Properties" value={String(stats?.totalProperties || 0)} icon={Building2} />
          <StatCard title="Tenants" value={String(stats?.totalTenants || 0)} icon={Users} />
          <StatCard title="Occupancy" value={`${stats?.occupancyRate || 0}%`} icon={TrendingUp} />
          <StatCard title="Collected" value={formatCurrency(stats?.totalRentCollected || 0)} icon={DollarSign} variant="accent" />
          <StatCard title="Commission" value={formatCurrency(stats?.totalCommissionEarned || 0)} icon={Percent} />
          <StatCard title="Pending" value={String(stats?.pendingPayments || 0)} icon={FileText} />
        </div>

        {properties.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="py-12 text-center">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Properties Assigned</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                You haven't been assigned any properties yet. Contact your landlord or admin to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Properties Overview */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-semibold">Properties Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {properties.map((prop) => (
                  <div key={prop.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{prop.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{prop.address}</p>
                      <p className="text-xs text-muted-foreground truncate">Landlord: {prop.landlord_email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline">{prop.occupied_units}/{prop.total_units} units</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {prop.commission_type === "percentage" ? `${prop.commission_rate}%` : formatCurrency(prop.commission_rate)} commission
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Commission Breakdown */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-semibold">Commission Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {commissions.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{c.property_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Collected: {formatCurrency(c.total_collected)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(c.commission_earned)}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.commission_type === "percentage" ? `${c.commission_rate}%` : "Fixed"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
       </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentDashboard;
