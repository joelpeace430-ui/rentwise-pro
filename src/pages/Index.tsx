import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DollarSign, Building2, Users, FileText, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const Index = () => {
  const { stats, loading } = useDashboardStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading your portfolio overview...">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const hasData = stats && (stats.totalProperties > 0 || stats.totalTenants > 0);

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Welcome back! Here's your portfolio overview."
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon={DollarSign}
            variant="accent"
            className="animate-slide-up opacity-0 stagger-1"
          />
          <StatCard
            title="Properties"
            value={String(stats?.totalProperties || 0)}
            icon={Building2}
            className="animate-slide-up opacity-0 stagger-2"
          />
          <StatCard
            title="Active Tenants"
            value={String(stats?.totalTenants || 0)}
            icon={Users}
            className="animate-slide-up opacity-0 stagger-3"
          />
          <StatCard
            title="Pending Invoices"
            value={String(stats?.pendingInvoices || 0)}
            icon={FileText}
            className="animate-slide-up opacity-0 stagger-4"
          />
        </div>

        {!hasData ? (
          <Card className="shadow-md">
            <CardContent className="py-12 text-center">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Get Started</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Add your first property and tenants to see your dashboard come to life with real data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Recent Payments */}
              <Card className="shadow-md lg:col-span-2 animate-fade-in opacity-0 stagger-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats?.recentPayments && stats.recentPayments.length > 0 ? (
                    stats.recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {payment.tenant_initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {payment.tenant_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.property}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No payments recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Status */}
              <Card className="shadow-md animate-fade-in opacity-0 stagger-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.paymentStatusData && stats.paymentStatusData.some(d => d.value > 0) ? (
                    <>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.paymentStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {stats.paymentStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [`${value}%`, ""]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 space-y-2">
                        {stats.paymentStatusData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm text-muted-foreground">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {item.value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No invoice data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment Schedule */}
            <Card className="shadow-md animate-fade-in opacity-0 stagger-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Payment Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overdue Section */}
                {stats?.overduePayments && stats.overduePayments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">
                        Overdue ({stats.overduePayments.length})
                      </span>
                    </div>
                    <div className="space-y-3">
                      {stats.overduePayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {payment.tenant_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.property}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-xs text-destructive">
                              {payment.days_overdue} days overdue
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Section */}
                {stats?.upcomingPayments && stats.upcomingPayments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Upcoming
                      </span>
                    </div>
                    <div className="space-y-3">
                      {stats.upcomingPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {payment.tenant_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.property}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due in {payment.days_until} days
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!stats?.overduePayments || stats.overduePayments.length === 0) &&
                  (!stats?.upcomingPayments || stats.upcomingPayments.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending invoices scheduled
                    </div>
                  )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
