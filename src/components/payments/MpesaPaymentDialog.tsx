import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Smartphone } from "lucide-react";
import { Tenant } from "@/hooks/useTenants";
import { Invoice } from "@/hooks/useInvoices";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MpesaPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  invoices: Invoice[];
  onPaymentInitiated: () => void;
}

const MpesaPaymentDialog = ({
  open,
  onOpenChange,
  tenants,
  invoices,
  onPaymentInitiated,
}: MpesaPaymentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const tenantInvoices = invoices.filter(
    (inv) => inv.tenant_id === tenantId && inv.status !== "paid"
  );

  // Auto-fill phone from tenant
  const handleTenantChange = (value: string) => {
    setTenantId(value);
    setInvoiceId("");
    const tenant = tenants.find((t) => t.id === value);
    if (tenant?.phone) {
      setPhoneNumber(tenant.phone);
    }
  };

  // Auto-fill amount from invoice
  const handleInvoiceChange = (value: string) => {
    setInvoiceId(value);
    if (value) {
      const invoice = invoices.find((inv) => inv.id === value);
      if (invoice) {
        setAmount(invoice.amount.toString());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to initiate payments",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          phoneNumber,
          amount: parseFloat(amount),
          tenantId,
          invoiceId: invoiceId || undefined,
          accountReference: selectedTenant
            ? `${selectedTenant.first_name} ${selectedTenant.last_name}`
            : "RentPayment",
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({
          title: "M-Pesa Request Sent",
          description: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
        });
        onPaymentInitiated();
        onOpenChange(false);
        resetForm();
      } else {
        throw new Error(response.data?.error || "Failed to initiate M-Pesa payment");
      }
    } catch (error: any) {
      console.error("M-Pesa error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate M-Pesa payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTenantId("");
    setInvoiceId("");
    setPhoneNumber("");
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              M-Pesa Payment
            </DialogTitle>
            <DialogDescription>
              Send an STK Push to the tenant's phone for instant payment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={tenantId} onValueChange={handleTenantChange} required>
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
                <Select value={invoiceId} onValueChange={handleInvoiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No invoice</SelectItem>
                    {tenantInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} - KES {inv.amount.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">M-Pesa Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="254712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Format: 254XXXXXXXXX (e.g., 254712345678)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !tenantId || !phoneNumber || !amount}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Send STK Push
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MpesaPaymentDialog;
