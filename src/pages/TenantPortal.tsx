import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantAuth } from "@/contexts/TenantAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, FileText, CreditCard, LogOut, Home, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  issue_date: string;
  description: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  notes: string | null;
}

const TenantPortal = () => {
  const { user, tenant, loading, signOut } = useTenantAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/tenant/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!tenant?.id) return;

      const [invoicesRes, paymentsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .eq("tenant_id", tenant.id)
          .order("due_date", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .eq("tenant_id", tenant.id)
          .order("payment_date", { ascending: false }),
      ]);

      if (invoicesRes.data) setInvoices(invoicesRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      setDataLoading(false);
    };

    if (tenant) {
      fetchData();
    }
  }, [tenant]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/tenant/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return <Badge className="bg-success/10 text-success border-0">Paid</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-0">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-destructive/10 text-destructive border-0">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalDue = invoices
    .filter((inv) => inv.status === "pending" || inv.status === "overdue")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold">Tenant Portal</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {tenant.first_name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Unit</p>
                <p className="text-xl font-semibold">{tenant.unit_number}</p>
                <p className="text-sm text-muted-foreground">
                  {tenant.property?.name}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-xl font-semibold">
                  ${totalDue.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {invoices.filter((i) => i.status === "pending").length} pending invoices
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <CreditCard className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-semibold">
                  ${totalPaid.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">This year</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment History
            </TabsTrigger>
            <TabsTrigger value="pay" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Make Payment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Your Invoices</CardTitle>
                <CardDescription>
                  View and track all your rent invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="mb-2 h-8 w-8" />
                    <p>No invoices yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.issue_date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.due_date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>${Number(invoice.amount).toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View all your past payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : payments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CreditCard className="mb-2 h-8 w-8" />
                    <p>No payments recorded yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">
                            ${Number(payment.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.payment_method.replace("_", " ")}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {payment.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pay">
            <Card>
              <CardHeader>
                <CardTitle>Make a Payment</CardTitle>
                <CardDescription>
                  Choose a method to pay your rent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-lg border bg-muted/30 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Monthly Rent</p>
                        <p className="text-2xl font-bold">
                          ${tenant.monthly_rent.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {totalDue > 0 && (
                      <div className="rounded-md bg-warning/10 p-3 text-sm text-warning">
                        You have ${totalDue.toLocaleString()} in pending invoices.
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Payment Instructions</h3>
                    <div className="space-y-3">
                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium mb-2">Bank Transfer</h4>
                        <p className="text-sm text-muted-foreground">
                          Contact your landlord for bank transfer details. Include your unit number in the transfer reference.
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium mb-2">Check</h4>
                        <p className="text-sm text-muted-foreground">
                          Make checks payable to your landlord. Include your unit number on the memo line.
                        </p>
                      </div>
                      <div className="rounded-lg border p-4 bg-muted/20">
                        <h4 className="font-medium mb-2">Online Payments</h4>
                        <p className="text-sm text-muted-foreground">
                          Online payment integration coming soon. Contact your landlord for current payment options.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TenantPortal;
