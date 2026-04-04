import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Phone,
  Home,
  Calendar,
  MessageSquare,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Tenant } from "@/hooks/useTenants";

interface TenantProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onSendMessage: (tenant: Tenant) => void;
  onGenerateInvoice: (tenant: Tenant) => void;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string;
}

interface MaintenanceRecord {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

interface DocumentRecord {
  id: string;
  name: string;
  document_type: string;
  created_at: string;
  file_url: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(amount);

const TenantProfileSheet = ({
  open,
  onOpenChange,
  tenant,
  onSendMessage,
  onGenerateInvoice,
}: TenantProfileSheetProps) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenant && open) {
      setLoading(true);
      Promise.all([
        supabase
          .from("payments")
          .select("id, amount, payment_date, status, payment_method")
          .eq("tenant_id", tenant.id)
          .order("payment_date", { ascending: false })
          .limit(20),
        supabase
          .from("maintenance_requests")
          .select("id, title, status, priority, created_at")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("documents")
          .select("id, name, document_type, created_at, file_url")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false }),
      ]).then(([paymentsRes, maintenanceRes, documentsRes]) => {
        setPayments((paymentsRes.data as PaymentRecord[]) || []);
        setMaintenance((maintenanceRes.data as MaintenanceRecord[]) || []);
        setDocuments((documentsRes.data as DocumentRecord[]) || []);
        setLoading(false);
      });
    }
  }, [tenant, open]);

  if (!tenant) return null;

  const initials = `${tenant.first_name.charAt(0)}${tenant.last_name.charAt(0)}`.toUpperCase();

  const statusConfig = {
    paid: { color: "bg-success/10 text-success border-success/20", icon: CheckCircle2, label: "Paid" },
    pending: { color: "bg-warning/10 text-warning border-warning/20", icon: Clock, label: "Pending" },
    overdue: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle, label: "Overdue" },
  };

  const status = statusConfig[tenant.rent_status] || statusConfig.pending;
  const StatusIcon = status.icon;

  // Group payments by month
  const groupedPayments = payments.reduce((acc, p) => {
    const monthKey = format(new Date(p.payment_date), "MMMM yyyy");
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(p);
    return acc;
  }, {} as Record<string, PaymentRecord[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-0">
          <SheetTitle className="text-xl font-bold">Tenant Profile</SheetTitle>
        </SheetHeader>

        {/* Profile Header */}
        <div className="mt-4 flex items-start gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-background shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {tenant.first_name} {tenant.last_name}
              </h3>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Mail className="h-3 w-3" />
                {tenant.first_name} = Home
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Home className="h-3.5 w-3.5" />
              Unit {tenant.unit_number} | {tenant.property?.name || "Unknown"}
            </div>
            <p className="text-sm font-semibold text-foreground mt-1">
              Rent: {formatCurrency(tenant.monthly_rent)}/month
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3" />
              Lease Ends: {format(new Date(tenant.lease_end), "MMM d, yyyy")}
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Tabs */}
        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No payment history</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPayments).map(([month, monthPayments]) => (
                  <div key={month}>
                    {monthPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{month}</span>
                          <Badge
                            variant="secondary"
                            className={
                              p.status === "completed"
                                ? "bg-success/10 text-success border-success/20"
                                : p.status === "failed"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-warning/10 text-warning border-warning/20"
                            }
                          >
                            {p.status === "completed" ? "Paid" : p.status === "failed" ? "Late ▼" : "Pending"}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground mr-3">
                            {formatCurrency(p.amount)}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : maintenance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No maintenance requests</p>
            ) : (
              <div className="space-y-3">
                {maintenance.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(m.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          m.priority === "high" || m.priority === "urgent"
                            ? "text-destructive border-destructive/30"
                            : m.priority === "medium"
                            ? "text-warning border-warning/30"
                            : "text-muted-foreground"
                        }
                      >
                        {m.priority}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          m.status === "resolved" || m.status === "completed"
                            ? "bg-success/10 text-success"
                            : m.status === "in_progress"
                            ? "bg-primary/10 text-primary"
                            : "bg-warning/10 text-warning"
                        }
                      >
                        {m.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded</p>
            ) : (
              <div className="space-y-3">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.document_type} • {format(new Date(d.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(d.file_url, "_blank")}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t">
          <Button
            className="gap-2"
            onClick={() => onSendMessage(tenant)}
          >
            <MessageSquare className="h-4 w-4" />
            Send Message
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onGenerateInvoice(tenant)}
          >
            <FileText className="h-4 w-4" />
            Generate Invoice
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TenantProfileSheet;
