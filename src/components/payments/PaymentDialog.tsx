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
import { Payment, CreatePaymentInput } from "@/hooks/usePayments";
import { Tenant } from "@/hooks/useTenants";
import { Invoice } from "@/hooks/useInvoices";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment | null;
  tenants: Tenant[];
  invoices: Invoice[];
  onSave: (data: CreatePaymentInput) => Promise<{ error?: Error | null }>;
}

const PaymentDialog = ({ open, onOpenChange, payment, tenants, invoices, onSave }: PaymentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CreatePaymentInput["payment_method"]>("bank_transfer");
  const [paymentDate, setPaymentDate] = useState("");
  const [status, setStatus] = useState<"completed" | "processing" | "failed">("completed");
  const [notes, setNotes] = useState("");

  const tenantInvoices = invoices.filter((inv) => inv.tenant_id === tenantId && inv.status !== "paid");

  useEffect(() => {
    if (payment) {
      setTenantId(payment.tenant_id);
      setInvoiceId(payment.invoice_id || "");
      setAmount(payment.amount.toString());
      setPaymentMethod(payment.payment_method);
      setPaymentDate(payment.payment_date);
      setStatus(payment.status);
      setNotes(payment.notes || "");
    } else {
      const now = new Date();
      setTenantId("");
      setInvoiceId("");
      setAmount("");
      setPaymentMethod("bank_transfer");
      setPaymentDate(now.toISOString().split("T")[0]);
      setStatus("completed");
      setNotes("");
    }
  }, [payment, open]);

  // Auto-fill amount when invoice is selected
  useEffect(() => {
    if (invoiceId && !payment) {
      const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);
      if (selectedInvoice) {
        setAmount(selectedInvoice.amount.toString());
      }
    }
  }, [invoiceId, invoices, payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await onSave({
      tenant_id: tenantId,
      invoice_id: invoiceId || undefined,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      payment_date: paymentDate,
      status,
      notes: notes || undefined,
    });

    setLoading(false);
    if (!result.error) {
      onOpenChange(false);
    }
  };

  const paymentMethodLabels: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    credit_card: "Credit Card",
    ach: "ACH",
    cash: "Cash",
    check: "Check",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{payment ? "Edit Payment" : "Record Payment"}</DialogTitle>
            <DialogDescription>
              {payment
                ? "Update the payment details below."
                : "Record a new payment from a tenant."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={tenantId} onValueChange={(v) => { setTenantId(v); setInvoiceId(""); }} required>
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
            {tenantId && tenantInvoices.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="invoice">Link to Invoice (Optional)</Label>
                <Select value={invoiceId} onValueChange={setInvoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No invoice</SelectItem>
                    {tenantInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} - ${inv.amount}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v: "completed" | "processing" | "failed") => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment received via online transfer"
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
              ) : payment ? (
                "Update Payment"
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
