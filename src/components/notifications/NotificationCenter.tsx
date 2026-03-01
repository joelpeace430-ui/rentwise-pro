import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check, AlertTriangle, FileText, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  overdue: <AlertTriangle className="h-4 w-4 text-destructive" />,
  invoice: <FileText className="h-4 w-4 text-primary" />,
  lease: <Calendar className="h-4 w-4 text-yellow-600" />,
  info: <Bell className="h-4 w-4 text-muted-foreground" />,
};

const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications((data as Notification[]) || []);
  };

  useEffect(() => {
    fetchNotifications();

    // Also generate smart notifications from existing data
    generateSmartNotifications();
  }, [user?.id]);

  const generateSmartNotifications = async () => {
    if (!user?.id) return;

    // Check for overdue invoices
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("*, tenant:tenants(first_name, last_name)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("due_date", new Date().toISOString().split("T")[0]);

    // Check for expiring leases (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringLeases } = await supabase
      .from("tenants")
      .select("*, property:properties(name)")
      .eq("user_id", user.id)
      .lte("lease_end", thirtyDaysFromNow.toISOString().split("T")[0])
      .gte("lease_end", new Date().toISOString().split("T")[0]);

    // Check unread messages
    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("*, tenant:tenants!inner(first_name, last_name, user_id)")
      .eq("sender_type", "tenant")
      .eq("is_read", false);

    const filteredMessages = (unreadMessages || []).filter(
      (m: any) => m.tenant?.user_id === user.id
    );

    const smartNotifs: Notification[] = [];

    (overdueInvoices || []).forEach((inv: any) => {
      smartNotifs.push({
        id: `overdue-${inv.id}`,
        title: "Overdue Invoice",
        message: `${inv.tenant?.first_name} ${inv.tenant?.last_name} - ${inv.invoice_number} is overdue`,
        type: "overdue",
        is_read: false,
        link: "/invoices",
        created_at: inv.due_date,
      });
    });

    (expiringLeases || []).forEach((t: any) => {
      smartNotifs.push({
        id: `lease-${t.id}`,
        title: "Lease Expiring Soon",
        message: `${t.first_name} ${t.last_name}'s lease at ${t.property?.name} expires on ${t.lease_end}`,
        type: "lease",
        is_read: false,
        link: "/tenants",
        created_at: new Date().toISOString(),
      });
    });

    filteredMessages.forEach((msg: any) => {
      smartNotifs.push({
        id: `msg-${msg.id}`,
        title: "New Message",
        message: `${msg.tenant?.first_name} ${msg.tenant?.last_name}: ${msg.content.slice(0, 60)}...`,
        type: "info",
        is_read: false,
        link: "/tenants",
        created_at: msg.created_at,
      });
    });

    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newOnes = smartNotifs.filter((n) => !existingIds.has(n.id));
      return [...newOnes, ...prev];
    });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user?.id) return;
    // Mark DB notifications as read
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 15).map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex gap-2.5">
                    <div className="mt-0.5">{typeIcons[notif.type] || typeIcons.info}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
