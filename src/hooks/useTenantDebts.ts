import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TenantDebt {
  id: string;
  tenant_id: string;
  property_id: string;
  user_id: string;
  month_year: string;
  rent_amount: number;
  amount_paid: number;
  penalty_amount: number;
  total_owed: number;
  penalty_rate: number;
  grace_period_days: number;
  due_date: string;
  penalty_applied_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant?: {
    first_name: string;
    last_name: string;
    unit_number: string;
    email: string;
    property?: {
      name: string;
    };
  };
}

export const useTenantDebts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debts, setDebts] = useState<TenantDebt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDebts = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("tenant_debts")
      .select(`
        *,
        tenant:tenants(first_name, last_name, unit_number, email, property:properties(name))
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching debts:", error);
      toast({ title: "Error", description: "Failed to load debt records", variant: "destructive" });
    } else {
      setDebts((data as any) || []);
    }
    setLoading(false);
  };

  const runPenaltyCalculation = async () => {
    try {
      const { error } = await supabase.functions.invoke("calculate-penalties");
      if (error) throw error;
      toast({ title: "Success", description: "Penalty calculation completed" });
      await fetchDebts();
    } catch (err) {
      console.error("Error running penalty calculation:", err);
      toast({ title: "Error", description: "Failed to run penalty calculation", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [user]);

  const totalOutstanding = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + Number(d.total_owed), 0);

  const totalPenalties = debts.reduce((sum, d) => sum + Number(d.penalty_amount), 0);

  const overdueCount = debts.filter((d) => d.status === "overdue").length;

  return {
    debts,
    loading,
    fetchDebts,
    runPenaltyCalculation,
    totalOutstanding,
    totalPenalties,
    overdueCount,
  };
};
