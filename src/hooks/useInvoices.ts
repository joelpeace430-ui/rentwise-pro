import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Invoice {
  id: string;
  user_id: string;
  tenant_id: string;
  invoice_number: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: "paid" | "pending" | "overdue";
  description: string | null;
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

export interface CreateInvoiceInput {
  tenant_id: string;
  invoice_number: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status?: "paid" | "pending" | "overdue";
  description?: string;
}

export const useInvoices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        tenant:tenants(
          first_name,
          last_name,
          unit_number,
          property:properties(name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } else {
      setInvoices(data as Invoice[]);
    }
    setLoading(false);
  };

  const createInvoice = async (input: CreateInvoiceInput) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        ...input,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Invoice created successfully",
    });
    await fetchInvoices();
    return { data };
  };

  const updateInvoice = async (id: string, input: Partial<CreateInvoiceInput>) => {
    const { error } = await supabase
      .from("invoices")
      .update(input)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Invoice updated successfully",
    });
    await fetchInvoices();
    return { error: null };
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Invoice deleted successfully",
    });
    await fetchInvoices();
    return { error: null };
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  return {
    invoices,
    loading,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
};
