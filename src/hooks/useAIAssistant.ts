import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export const useAIAssistant = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (input: string) => {
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
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
          type: "chat",
          messages: [...messages, userMsg],
        }),
      });

      if (response.status === 429) {
        toast({
          title: "Rate Limited",
          description: "Too many requests. Please try again later.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (response.status === 402) {
        toast({
          title: "Credits Exhausted",
          description: "AI credits are exhausted. Please contact support.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Add empty assistant message
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
            // Incomplete JSON, wait for more data
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("AI chat error:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentScore = async (tenantId: string) => {
    try {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "payment_score",
          tenantId,
        }),
      });

      if (!response.ok) throw new Error("Failed to get payment score");

      return await response.json();
    } catch (error) {
      console.error("Payment score error:", error);
      return null;
    }
  };

  const getRiskPrediction = async (tenantId: string) => {
    try {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "risk_prediction",
          tenantId,
        }),
      });

      if (!response.ok) throw new Error("Failed to get risk prediction");

      return await response.json();
    } catch (error) {
      console.error("Risk prediction error:", error);
      return null;
    }
  };

  const getPricingSuggestion = async (propertyId: string) => {
    try {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "pricing_suggestion",
          propertyId,
        }),
      });

      if (!response.ok) throw new Error("Failed to get pricing suggestion");

      return await response.json();
    } catch (error) {
      console.error("Pricing suggestion error:", error);
      return null;
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    getPaymentScore,
    getRiskPrediction,
    getPricingSuggestion,
  };
};
