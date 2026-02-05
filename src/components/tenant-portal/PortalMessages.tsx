import { useState, useEffect, useRef, ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Loader2, ImagePlus, X, Wrench, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  sender_type: "tenant" | "landlord";
  content: string;
  is_read: boolean;
  created_at: string;
  image_urls?: string[];
  message_type?: string;
}

interface PortalMessagesProps {
  tenantId: string;
  onMessagesRead?: () => void;
}

const PortalMessages = ({ tenantId, onMessagesRead }: PortalMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isMaintenanceRequest, setIsMaintenanceRequest] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    // Mark unread messages as read
    const unreadIds = data?.filter((m) => !m.is_read && m.sender_type === "landlord").map((m) => m.id) || [];
    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", unreadIds);
      onMessagesRead?.();
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("messages-channel")
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
          
          // Mark as read if from landlord
          if (newMsg.sender_type === "landlord") {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 5 - selectedImages.length);
    const validFiles = newFiles.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      return isValidType && isValidSize;
    });

    if (validFiles.length < newFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only images/videos under 10MB are allowed",
        variant: "destructive",
      });
    }

    setSelectedImages(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];
    
    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    for (const file of selectedImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('maintenance-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('maintenance-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    setUploadingImages(false);
    return uploadedUrls;
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    
    let imageUrls: string[] = [];
    if (selectedImages.length > 0) {
      imageUrls = await uploadImages();
    }

    const { error } = await supabase.from("messages").insert({
      tenant_id: tenantId,
      sender_type: "tenant",
      content: newMessage.trim(),
      is_read: false,
      image_urls: imageUrls,
      message_type: isMaintenanceRequest ? "maintenance" : "general",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
      setSelectedImages([]);
      setImagePreviewUrls([]);
      setIsMaintenanceRequest(false);
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
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
            <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-center">No messages yet</p>
            <p className="text-sm text-center">Send a message to your landlord</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === "tenant" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.sender_type === "tenant"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {message.message_type === "maintenance" && (
                      <div className="flex items-center gap-1 mb-2">
                        <Wrench className="h-3 w-3" />
                        <span className="text-xs font-medium">Maintenance Request</span>
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
                            className="block"
                          >
                            <img 
                              src={url} 
                              alt={`Attachment ${idx + 1}`} 
                              className="rounded-lg max-h-32 w-full object-cover hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        message.sender_type === "tenant" ? "text-primary-foreground/70" : "text-muted-foreground"
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

        {/* Message Input */}
        <div className="border-t p-4">
          {/* Image Previews */}
          {imagePreviewUrls.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img 
                    src={url} 
                    alt={`Preview ${index + 1}`} 
                    className="h-16 w-16 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Maintenance Toggle */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              type="button"
              variant={isMaintenanceRequest ? "default" : "outline"}
              size="sm"
              onClick={() => setIsMaintenanceRequest(!isMaintenanceRequest)}
              className="gap-2"
            >
              <Wrench className="h-4 w-4" />
              {isMaintenanceRequest ? "Maintenance Request" : "Mark as Maintenance"}
            </Button>
            {isMaintenanceRequest && (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Will be prioritized
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*,video/*"
              multiple
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || selectedImages.length >= 5}
              className="shrink-0"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Textarea
              placeholder={isMaintenanceRequest ? "Describe the maintenance issue..." : "Type a message..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-[120px] resize-none"
              disabled={sending}
            />
            <Button 
              onClick={handleSend} 
              disabled={!newMessage.trim() || sending || uploadingImages} 
              size="icon" 
              className="shrink-0"
            >
              {sending || uploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send • Attach up to 5 photos/videos for maintenance issues
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortalMessages;
