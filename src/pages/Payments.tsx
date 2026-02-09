import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Smartphone,
  Banknote,
  CreditCard,
} from "lucide-react";
import { usePayments, Payment } from "@/hooks/usePayments";
import { useTenants } from "@/hooks/useTenants";
import { useInvoices } from "@/hooks/useInvoices";
import PaymentDialog from "@/components/payments/PaymentDialog";
import MpesaPaymentDialog from "@/components/payments/MpesaPaymentDialog";
import { format } from "date-fns";

const Payments = () => {
  const { payments, loading, createPayment, updatePayment, deletePayment } = usePayments();
  const { tenants } = useTenants();
  const { invoices } = useInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mpesaDialogOpen, setMpesaDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const filteredPayments = payments.filter((pmt) => {
    const matchesSearch =
      `${pmt.tenant?.first_name} ${pmt.tenant?.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || pmt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const completedTotal = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const processingTotal = payments
    .filter((p) => p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);
  const failedTotal = payments
    .filter((p) => p.status === "failed")
    .reduce((sum, p) => sum + p.amount, 0);

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setDialogOpen(true);
  };

  const handleDelete = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (paymentToDelete) {
      await deletePayment(paymentToDelete.id);
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleSave = async (data: any) => {
    if (editingPayment) {
      return updatePayment(editingPayment.id, data);
    }
    return createPayment(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const paymentMethodLabels: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    credit_card: "Credit Card",
    ach: "ACH",
    cash: "Cash",
    check: "Check",
    mpesa: "M-Pesa",
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Processing</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="Payments"
      subtitle="Track and manage all payment transactions"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                  <p className="text-2xl font-bold">{formatCurrency(completedTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold">{formatCurrency(processingTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{formatCurrency(failedTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by tenant name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setMpesaDialogOpen(true)}
              disabled={tenants.length === 0}
            >
              <Smartphone className="h-4 w-4" />
              M-Pesa
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                setEditingPayment(null);
                setDialogOpen(true);
              }}
              disabled={tenants.length === 0}
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </Button>
          </div>
        </div>

        {tenants.length === 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-warning" />
              <p className="text-sm">
                You need to add tenants before you can record payments.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payments Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-1">
                  {search || statusFilter !== "all" ? "No payments found" : "No payments yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Record your first payment to get started"}
                </p>
                {!search && statusFilter === "all" && tenants.length > 0 && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payment.tenant?.first_name} {payment.tenant?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.tenant?.property?.name} · {payment.tenant?.unit_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(payment)}>
                              Edit Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(payment)}
                            >
                              Delete Payment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPayment(null);
        }}
        payment={editingPayment}
        tenants={tenants}
        invoices={invoices}
        onSave={handleSave}
      />

      <MpesaPaymentDialog
        open={mpesaDialogOpen}
        onOpenChange={setMpesaDialogOpen}
        tenants={tenants}
        invoices={invoices}
        onPaymentInitiated={() => {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Payments;
