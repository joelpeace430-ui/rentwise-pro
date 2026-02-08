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
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Smartphone,
  ArrowUpRight,
  Banknote,
  TrendingUp,
  Hash,
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
  const totalPaymentsCount = payments.length;

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

  const paymentMethodIcons: Record<string, string> = {
    bank_transfer: "🏦",
    credit_card: "💳",
    ach: "🔄",
    cash: "💵",
    check: "📝",
    mpesa: "📱",
  };

  const summaryStats = [
    {
      title: "Total Collected",
      value: formatCurrency(completedTotal),
      icon: CheckCircle,
      iconColor: "text-success",
      iconBg: "bg-success/10",
      accentBg: "bg-success/5",
      subtitle: `${payments.filter(p => p.status === "completed").length} payments`,
    },
    {
      title: "Processing",
      value: formatCurrency(processingTotal),
      icon: Clock,
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
      accentBg: "bg-warning/5",
      subtitle: `${payments.filter(p => p.status === "processing").length} pending`,
    },
    {
      title: "Failed",
      value: formatCurrency(failedTotal),
      icon: AlertCircle,
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
      accentBg: "bg-destructive/5",
      subtitle: `${payments.filter(p => p.status === "failed").length} failed`,
    },
    {
      title: "Total Transactions",
      value: totalPaymentsCount.toString(),
      icon: Hash,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      accentBg: "bg-primary/5",
      subtitle: "All time",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20 gap-1 px-2.5 py-0.5">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 gap-1 px-2.5 py-0.5">
            <Clock className="h-3 w-3" />
            Processing
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 px-2.5 py-0.5">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTenantInitials = (firstName?: string, lastName?: string) => {
    return `${(firstName || "?")[0]}${(lastName || "?")[0]}`.toUpperCase();
  };

  return (
    <DashboardLayout
      title="Payments"
      subtitle="Track and manage all payment transactions"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map((stat) => (
            <Card
              key={stat.title}
              className="shadow-md border-0 relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 ${stat.accentBg} rounded-bl-[5rem] -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-110`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between relative">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} shadow-sm`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by tenant name..."
                className="pl-9 h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-11">
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
              className="gap-2 h-11 border-success/40 text-success hover:bg-success/5 hover:text-success hover:border-success/60"
              onClick={() => setMpesaDialogOpen(true)}
              disabled={tenants.length === 0}
            >
              <Smartphone className="h-4 w-4" />
              M-Pesa
            </Button>
            <Button
              className="gap-2 h-11 px-6 shadow-md"
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
          <Card className="border-warning/30 bg-gradient-to-r from-warning/5 to-warning/10 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15">
                <AlertCircle className="h-4 w-4 text-warning" />
              </div>
              <p className="text-sm text-foreground">
                You need to add tenants before you can record payments.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payments Table */}
        <Card className="shadow-md border-0 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-20">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mx-auto mb-5">
                  <Banknote className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {search || statusFilter !== "all" ? "No payments found" : "No payments yet"}
                </h3>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Record your first payment to get started"}
                </p>
                {!search && statusFilter === "all" && tenants.length > 0 && (
                  <Button onClick={() => setDialogOpen(true)} className="shadow-md px-6 h-11">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30 border-b border-border/50">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Tenant</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Amount</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Method</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow
                        key={payment.id}
                        className="group hover:bg-muted/30 transition-colors duration-150 border-b border-border/30"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-sm font-bold ring-1 ring-primary/10">
                              {getTenantInitials(payment.tenant?.first_name, payment.tenant?.last_name)}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {payment.tenant?.first_name} {payment.tenant?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {payment.tenant?.property?.name} • {payment.tenant?.unit_number}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-foreground text-base">
                            {formatCurrency(payment.amount)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{paymentMethodIcons[payment.payment_method] || "💰"}</span>
                            <span className="text-sm text-muted-foreground">
                              {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">
                            {format(new Date(payment.payment_date), "MMM d, yyyy")}
                          </p>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
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
              </div>
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
