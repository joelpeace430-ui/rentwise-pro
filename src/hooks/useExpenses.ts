import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Expense {
  id: string;
  user_id: string;
  property_id: string | null;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  vendor: string | null;
  receipt_url: string | null;
  is_tax_deductible: boolean;
  created_at: string;
  updated_at: string;
  property?: { name: string } | null;
}

export interface CreateExpenseInput {
  property_id?: string | null;
  category: string;
  description?: string;
  amount: number;
  expense_date: string;
  vendor?: string;
  is_tax_deductible?: boolean;
}

export const EXPENSE_CATEGORIES = [
  "Property Maintenance",
  "Repairs",
  "Insurance",
  "Property Taxes",
  "Utilities",
  "Management Fees",
  "Legal & Professional",
  "Advertising",
  "Cleaning",
  "Landscaping",
  "Supplies",
  "Travel",
  "Other",
] as const;

export const useExpenses = (selectedYear?: number) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from("expenses")
        .select("*, property:properties(name)")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });

      if (selectedYear) {
        query = query
          .gte("expense_date", `${selectedYear}-01-01`)
          .lte("expense_date", `${selectedYear}-12-31`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data as Expense[]);
    } catch (error: any) {
      toast.error("Failed to fetch expenses");
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const createExpense = async (input: CreateExpenseInput) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Expense added successfully");
      fetchExpenses();
      return data;
    } catch (error: any) {
      toast.error("Failed to add expense");
      console.error("Error creating expense:", error);
      return null;
    }
  };

  const updateExpense = async (id: string, input: Partial<CreateExpenseInput>) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .update(input)
        .eq("id", id);

      if (error) throw error;
      toast.success("Expense updated successfully");
      fetchExpenses();
    } catch (error: any) {
      toast.error("Failed to update expense");
      console.error("Error updating expense:", error);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Expense deleted successfully");
      fetchExpenses();
    } catch (error: any) {
      toast.error("Failed to delete expense");
      console.error("Error deleting expense:", error);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [user?.id, selectedYear]);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const taxDeductibleTotal = expenses
    .filter((e) => e.is_tax_deductible)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  return {
    expenses,
    loading,
    createExpense,
    updateExpense,
    deleteExpense,
    totalExpenses,
    taxDeductibleTotal,
    expensesByCategory,
    refetch: fetchExpenses,
  };
};
