import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Home, DollarSign, Calendar, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface TenantData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  unit_number: string;
  monthly_rent: number;
  lease_start?: string;
  lease_end?: string;
  property?: {
    name: string;
    address: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  issue_date: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
}

interface PortalDashboardProps {
  tenant: TenantData;
  invoices: Invoice[];
  payments: Payment[];
  unreadMessages: number;
}

const PortalDashboard = ({ tenant, invoices, payments, unreadMessages }: PortalDashboardProps) => {
  const totalDue = invoices
    .filter((inv) => inv.status === "pending" || inv.status === "overdue")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const overdueInvoices = invoices.filter((inv) => inv.status === "overdue");
  const pendingInvoices = invoices.filter((inv) => inv.status === "pending");

  // Calculate lease progress
  const leaseStart = tenant.lease_start ? new Date(tenant.lease_start) : null;
  const leaseEnd = tenant.lease_end ? new Date(tenant.lease_end) : null;
  const today = new Date();
  
  let leaseProgress = 0;
  let daysRemaining = 0;
  
  if (leaseStart && leaseEnd) {
    const totalDays = differenceInDays(leaseEnd, leaseStart);
    const elapsedDays = differenceInDays(today, leaseStart);
    leaseProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    daysRemaining = Math.max(0, differenceInDays(leaseEnd, today));
  }

  // Calculate payment trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentPayments = payments.filter(
    (p) => new Date(p.payment_date) >= sixMonthsAgo && p.status === "completed"
  );
  const monthlyAverage = recentPayments.length > 0 
    ? recentPayments.reduce((sum, p) => sum + Number(p.amount), 0) / 6 
    : 0;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(overdueInvoices.length > 0 || unreadMessages > 0) && (
        <div className="space-y-2">
          {overdueInvoices.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Overdue Payment</p>
                <p className="text-sm text-muted-foreground">
                  You have {overdueInvoices.length} overdue invoice(s) totaling ${overdueInvoices.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}
          {unreadMessages > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/5 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {unreadMessages}
              </div>
              <div>
                <p className="font-medium">New Messages</p>
                <p className="text-sm text-muted-foreground">
                  You have {unreadMessages} unread message(s) from your landlord
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Unit</p>
                <p className="text-xl font-bold">{tenant.unit_number}</p>
              </div>
            </div>
            <div className="border-t bg-muted/30 px-6 py-3">
              <p className="text-xs text-muted-foreground truncate">{tenant.property?.name}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-xl font-bold">${totalDue.toLocaleString()}</p>
              </div>
            </div>
            <div className="border-t bg-muted/30 px-6 py-3">
              <p className="text-xs text-muted-foreground">
                {pendingInvoices.length} pending invoice(s)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-success/20 to-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold">${totalPaid.toLocaleString()}</p>
              </div>
            </div>
            <div className="border-t bg-muted/30 px-6 py-3">
              <p className="text-xs text-muted-foreground">
                ~${Math.round(monthlyAverage).toLocaleString()}/mo avg
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                <Clock className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lease Ends</p>
                <p className="text-xl font-bold">
                  {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
                </p>
              </div>
            </div>
            <div className="border-t bg-muted/30 px-6 py-3">
              <p className="text-xs text-muted-foreground">
                {leaseEnd ? format(leaseEnd, "MMM d, yyyy") : "No lease end date"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lease Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Lease Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={leaseProgress} className="h-3" />
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Start</p>
                <p className="font-medium">
                  {leaseStart ? format(leaseStart, "MMM d, yyyy") : "-"}
                </p>
              </div>
              <div className="text-center">
                <Badge variant={daysRemaining < 60 ? "destructive" : "secondary"}>
                  {Math.round(leaseProgress)}% Complete
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">End</p>
                <p className="font-medium">
                  {leaseEnd ? format(leaseEnd, "MMM d, yyyy") : "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet</p>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 3).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(invoice.due_date), "MMM d")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${Number(invoice.amount).toLocaleString()}</p>
                      <Badge 
                        variant="outline" 
                        className={
                          invoice.status === "paid" 
                            ? "text-success border-success/30" 
                            : invoice.status === "overdue" 
                            ? "text-destructive border-destructive/30"
                            : "text-warning border-warning/30"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">${Number(payment.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-success border-success/30">
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortalDashboard;
