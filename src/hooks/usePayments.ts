import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string | null;
  tenant_id: string;
  amount: number;
  payment_method: "bank_transfer" | "credit_card" | "ach" | "cash" | "check";
  payment_date: string;
  status: "completed" | "processing" | "failed";
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant?: {
    first_name: string;
    last_name: string;
    property: {
      name: string;
    };
    unit_number: string;
  };
}

export interface CreatePaymentInput {
  invoice_id?: string;
  tenant_id: string;
  amount: number;
  payment_method: "bank_transfer" | "credit_card" | "ach" | "cash" | "check";
  payment_date: string;
  status?: "completed" | "processing" | "failed";
  notes?: string;
}

export const usePayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        tenant:tenants(
          first_name,
          last_name,
          unit_number,
          property:properties(name)
        )
      `)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } else {
      setPayments(data as Payment[]);
    }
    setLoading(false);
  };

  const createPayment = async (input: CreatePaymentInput) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("payments")
      .insert({
        ...input,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
      return { error };
    }

    // If payment is completed and linked to an invoice, update invoice status
    if (input.status === "completed" && input.invoice_id) {
      await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", input.invoice_id);
    }

    toast({
      title: "Success",
      description: "Payment recorded successfully",
    });
    await fetchPayments();
    return { data };
  };

  const updatePayment = async (id: string, input: Partial<CreatePaymentInput>) => {
    const { error } = await supabase
      .from("payments")
      .update(input)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Payment updated successfully",
    });
    await fetchPayments();
    return { error: null };
  };

  const deletePayment = async (id: string) => {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Payment deleted successfully",
    });
    await fetchPayments();
    return { error: null };
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  return {
    payments,
    loading,
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
  };
};
