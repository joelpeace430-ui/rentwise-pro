import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, MoreHorizontal, FileText, Loader2 } from "lucide-react";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { useTenants } from "@/hooks/useTenants";
import InvoiceDialog from "@/components/invoices/InvoiceDialog";
import { format } from "date-fns";

const Invoices = () => {
  const { invoices, loading, createInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { tenants } = useTenants();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      `${inv.tenant?.first_name} ${inv.tenant?.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDelete = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (invoiceToDelete) {
      await deleteInvoice(invoiceToDelete.id);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleSave = async (data: any) => {
    if (editingInvoice) {
      return updateInvoice(editingInvoice.id, data);
    }
    return createInvoice(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  return (
    <DashboardLayout
      title="Invoices"
      subtitle="Create and manage tenant invoices"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search invoices..."
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
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingInvoice(null);
              setDialogOpen(true);
            }}
            disabled={tenants.length === 0}
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {tenants.length === 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <p className="text-sm text-warning">
                You need to add tenants before you can create invoices.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invoices Table */}
        <Card className="shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {search || statusFilter !== "all" ? "No invoices found" : "No invoices yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first invoice to get started"}
                </p>
                {!search && statusFilter === "all" && tenants.length > 0 && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[140px]">Invoice ID</TableHead>
                    <TableHead>Tenant / Property</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{invoice.invoice_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {invoice.tenant?.first_name} {invoice.tenant?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.tenant?.property?.name} {invoice.tenant?.unit_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invoice.issue_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invoice.due_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            invoice.status === "paid"
                              ? "badge-success"
                              : invoice.status === "pending"
                              ? "badge-warning"
                              : "badge-destructive"
                          }
                        >
                          {invoice.status === "paid"
                            ? "Paid"
                            : invoice.status === "pending"
                            ? "Pending"
                            : "Overdue"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                              Edit Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(invoice)}
                            >
                              Delete Invoice
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

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingInvoice(null);
        }}
        invoice={editingInvoice}
        tenants={tenants}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoice_number}?
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

export default Invoices;
