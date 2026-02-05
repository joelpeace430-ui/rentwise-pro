import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Wrench, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  sender_type: "tenant" | "landlord";
  content: string;
  is_read: boolean;
  created_at: string;
  image_urls?: string[];
  message_type?: string;
}

interface TenantMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

const TenantMessagesDialog = ({ open, onOpenChange, tenantId, tenantName }: TenantMessagesDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages((data || []) as Message[]);
    setLoading(false);

    // Mark tenant messages as read
    const unreadIds = data?.filter((m) => !m.is_read && m.sender_type === "tenant").map((m) => m.id) || [];
    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", unreadIds);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMessages();

      const channel = supabase
        .channel(`landlord-messages-${tenantId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, tenantId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      tenant_id: tenantId,
      sender_type: "landlord",
      content: newMessage.trim(),
      is_read: false,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Messages with {tenantName}
            {messages.filter((m) => !m.is_read && m.sender_type === "tenant").length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {messages.filter((m) => !m.is_read && m.sender_type === "tenant").length} unread
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-sm">Send a message to {tenantName}</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === "landlord" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.sender_type === "landlord"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      {message.message_type === "maintenance" && (
                        <div className="flex items-center gap-1 mb-2">
                          <Badge variant="secondary" className="gap-1 text-xs bg-warning/20 text-warning-foreground border-warning">
                            <Wrench className="h-3 w-3" />
                            Maintenance Request
                          </Badge>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      {message.image_urls && message.image_urls.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {message.image_urls.map((url, idx) => (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block relative group"
                            >
                              <img 
                                src={url} 
                                alt={`Maintenance photo ${idx + 1}`} 
                                className="rounded-lg max-h-32 w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <ExternalLink className="h-5 w-5 text-white" />
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_type === "landlord" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(message.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[44px] max-h-[120px] resize-none"
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon" className="shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantMessagesDialog;
