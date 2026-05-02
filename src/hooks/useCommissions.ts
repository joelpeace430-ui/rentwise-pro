import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CommissionEntry {
  id: string;
  payment_id: string;
  property_id: string;
  recipient_type: "agent" | "caretaker";
  recipient_user_id: string | null;
  caretaker_id: string | null;
  payment_amount: number;
  commission_type: string;
  commission_rate: number;
  commission_amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
}

export const useCommissions = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("commission_ledger" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data || []) as any as CommissionEntry[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const markPaid = async (id: string) => {
    const { error } = await supabase
      .from("commission_ledger" as any)
      .update({ status: "paid", paid_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (!error) await fetch();
    return { error };
  };

  return { entries, loading, refetch: fetch, markPaid };
};
