import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquareText, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SMSHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

interface SMSLog {
  id: string;
  message_type: string;
  message_content: string;
  phone_number: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  payment_prompt: "Payment Reminder",
  receipt_request: "Receipt",
  balance_inquiry: "Balance",
  lease_reminder: "Lease",
  help: "Help Menu",
  custom: "Custom",
};

const SMSHistorySheet = ({ open, onOpenChange, tenantId, tenantName }: SMSHistorySheetProps) => {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && tenantId) {
      fetchLogs();
    }
  }, [open, tenantId]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sms_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data as SMSLog[]);
    }
    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            SMS History — {tenantName}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-8rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquareText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No SMS messages sent yet</p>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[log.message_type] || log.message_type}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {log.status === "sent" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-4">
                    {log.message_content}
                  </p>
                  {log.error_message && (
                    <p className="text-xs text-destructive">Error: {log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SMSHistorySheet;
