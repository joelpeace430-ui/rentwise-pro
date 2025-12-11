import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Invoice, CreateInvoiceInput } from "@/hooks/useInvoices";
import { Tenant } from "@/hooks/useTenants";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  tenants: Tenant[];
  onSave: (data: CreateInvoiceInput) => Promise<{ error?: Error | null }>;
}

const InvoiceDialog = ({ open, onOpenChange, invoice, tenants, onSave }: InvoiceDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"paid" | "pending" | "overdue">("pending");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (invoice) {
      setTenantId(invoice.tenant_id);
      setInvoiceNumber(invoice.invoice_number);
      setAmount(invoice.amount.toString());
      setIssueDate(invoice.issue_date);
      setDueDate(invoice.due_date);
      setStatus(invoice.status);
      setDescription(invoice.description || "");
    } else {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      setTenantId("");
      setInvoiceNumber(`INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`);
      setAmount("");
      setIssueDate(now.toISOString().split("T")[0]);
      setDueDate(new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split("T")[0]);
      setStatus("pending");
      setDescription("");
    }
  }, [invoice, open]);

  // Auto-fill amount when tenant is selected
  useEffect(() => {
    if (tenantId && !invoice) {
      const selectedTenant = tenants.find((t) => t.id === tenantId);
      if (selectedTenant) {
        setAmount(selectedTenant.monthly_rent.toString());
      }
    }
  }, [tenantId, tenants, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await onSave({
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      amount: parseFloat(amount),
      issue_date: issueDate,
      due_date: dueDate,
      status,
      description: description || undefined,
    });

    setLoading(false);
    if (!result.error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{invoice ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
            <DialogDescription>
              {invoice
                ? "Update the invoice details below."
                : "Create a new invoice for a tenant."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={tenantId} onValueChange={setTenantId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} - {t.property?.name} {t.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v: "paid" | "pending" | "overdue") => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Monthly rent for December 2024"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !tenantId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : invoice ? (
                "Update Invoice"
              ) : (
                "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
