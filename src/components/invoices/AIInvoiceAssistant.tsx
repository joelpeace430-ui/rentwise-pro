import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, X, FileText, MessageSquare, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/hooks/useInvoices";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-invoice-assistant`;

const AIInvoiceAssistant = ({ onInvoicesCreated }: { onInvoicesCreated?: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const executeAction = async (actionData: any) => {
    try {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          ...actionData,
          userId: user?.id,
        }),
      });

      if (!response.ok) throw new Error("Action failed");
      const result = await response.json();

      // Add result message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **Action completed!**\n\n${result.message}\n\n${
          result.results
            ? result.results.map((r: any) => `- ${r.tenant}: ${r.status}${r.error ? ` (${r.error})` : ""}`).join("\n")
            : result.count ? `Created ${result.count} invoice(s)` : ""
        }`,
      }]);

      if (actionData.action === "generate_invoices") {
        onInvoicesCreated?.();
      }

      toast({ title: "Success", description: result.message });
    } catch (error) {
      toast({ title: "Error", description: "Failed to execute action", variant: "destructive" });
    }
  };

  const parseAndExecuteActions = (content: string) => {
    const actionMatch = content.match(/```action\s*\n?([\s\S]*?)\n?```/);
    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1]);
        // Show confirm button
        return actionData;
      } catch {
        return null;
      }
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "chat",
          messages: [...messages, userMsg],
          userId: user?.id,
        }),
      });

      if (response.status === 429) {
        toast({ title: "Rate Limited", description: "Please try again later.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (response.status === 402) {
        toast({ title: "Credits Exhausted", description: "AI credits are exhausted.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!response.ok || !response.body) throw new Error("Failed to start stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("AI chat error:", error);
      toast({ title: "Error", description: "Failed to get AI response", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = (content: string) => {
    const actionData = parseAndExecuteActions(content);
    if (actionData) {
      executeAction({ action: actionData.type, tenantIds: actionData.tenantIds, message: actionData.message });
    }
  };

  const quickActions = [
    { label: "Generate all invoices", prompt: "Generate invoices for all tenants for this month" },
    { label: "Send reminders", prompt: "Send payment reminders to all tenants with pending or overdue rent" },
    { label: "Invoice summary", prompt: "Give me a summary of all pending and overdue invoices" },
  ];

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="gap-2"
        variant="outline"
      >
        <Sparkles className="h-4 w-4" />
        AI Assistant
      </Button>
    );
  }

  return (
    <Card className="shadow-lg border-primary/20 w-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Invoice Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px] px-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="py-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                I can help you generate invoices, send reminders, and manage billing. Try these:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickActions.map((qa) => (
                  <Button
                    key={qa.label}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setInput(qa.prompt);
                    }}
                  >
                    {qa.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3 pb-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content.replace(/```action[\s\S]*?```/g, "")}</ReactMarkdown>
                      </div>
                      {msg.content.includes("```action") && (
                        <Button
                          size="sm"
                          className="mt-2 gap-1"
                          onClick={() => handleConfirmAction(msg.content)}
                        >
                          <FileText className="h-3 w-3" />
                          Confirm & Execute
                        </Button>
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about invoices, send reminders..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={isLoading}
            className="text-sm"
          />
          <Button size="icon" onClick={sendMessage} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIInvoiceAssistant;
