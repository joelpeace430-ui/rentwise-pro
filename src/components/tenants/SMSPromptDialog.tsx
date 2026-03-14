import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MessageSquareText,
  Send,
  CreditCard,
  Receipt,
  Wallet,
  FileText,
  HelpCircle,
  PenLine,
} from "lucide-react";
import { Tenant } from "@/hooks/useTenants";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SMSPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}

const MESSAGE_TYPES = [
  { value: "payment_prompt", label: "Payment Reminder", icon: CreditCard, description: "Send M-Pesa payment instructions with invoice details" },
  { value: "receipt_request", label: "Receipt", icon: Receipt, description: "Send latest payment receipt via SMS" },
  { value: "balance_inquiry", label: "Balance Summary", icon: Wallet, description: "Send outstanding balance and invoice details" },
  { value: "lease_reminder", label: "Lease Reminder", icon: FileText, description: "Remind tenant of upcoming lease expiry" },
  { value: "help", label: "Help Menu", icon: HelpCircle, description: "Send list of available SMS services" },
  { value: "custom", label: "Custom Message", icon: PenLine, description: "Write a custom SMS message" },
] as const;

const SMSPromptDialog = ({ open, onOpenChange, tenant }: SMSPromptDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState<string>("payment_prompt");
  const [customMessage, setCustomMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const selectedType = MESSAGE_TYPES.find((t) => t.value === messageType);

  const handleSend = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tenant-sms-prompts", {
        body: {
          tenantId: tenant.id,
          messageType,
          customMessage: messageType === "custom" ? customMessage : undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setPreview(data.preview);
        toast({
          title: "SMS Sent",
          description: data.message,
        });
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 2000);
      } else {
        toast({
          title: "SMS Failed",
          description: data?.error || "Failed to send SMS",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessageType("payment_prompt");
    setCustomMessage("");
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            Send SMS Prompt
          </DialogTitle>
          <DialogDescription>
            Send an SMS prompt to{" "}
            <span className="font-medium text-foreground">
              {tenant.first_name} {tenant.last_name}
            </span>{" "}
            {tenant.phone ? (
              <Badge variant="outline" className="ml-1 text-xs">{tenant.phone}</Badge>
            ) : (
              <Badge variant="destructive" className="ml-1 text-xs">No phone</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Message Type</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {messageType === "custom" && (
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                maxLength={480}
              />
              <p className="text-xs text-muted-foreground text-right">
                {customMessage.length}/480 characters
              </p>
            </div>
          )}

          {preview && (
            <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
              <Label className="text-xs text-muted-foreground">Message Preview</Label>
              <p className="text-sm whitespace-pre-line">{preview}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || !tenant.phone || (messageType === "custom" && !customMessage.trim())}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send SMS
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SMSPromptDialog;
