import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Receipt {
  id: string;
  user_id: string;
  payment_id: string;
  tenant_id: string;
  receipt_number: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  issued_at: string;
  sent_to_email: string | null;
  sent_at: string | null;
  pdf_url: string | null;
  created_at: string;
}

export const useReceipts = () => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generateReceipt = async (paymentId: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-receipt", {
        body: { paymentId },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Receipt Generated",
        description: `Receipt ${data.receipt?.receipt_number || ''} has been created and sent to the tenant.`,
      });

      return { data, error: null };
    } catch (err: any) {
      console.error("Error generating receipt:", err);
      toast({
        title: "Error",
        description: "Failed to generate receipt",
        variant: "destructive",
      });
      return { data: null, error: err };
    } finally {
      setGenerating(false);
    }
  };

  const fetchReceipts = async (tenantId?: string) => {
    let query = supabase
      .from("receipts")
      .select("*")
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching receipts:", error);
      return { data: null, error };
    }

    return { data: data as Receipt[], error: null };
  };

  return {
    generating,
    generateReceipt,
    fetchReceipts,
  };
};
