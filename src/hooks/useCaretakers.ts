import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Caretaker {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  assignment_count?: number;
}

export interface CaretakerInput {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  notes?: string;
  status?: string;
}

export const useCaretakers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCaretakers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("caretakers" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load caretakers", variant: "destructive" });
      setLoading(false);
      return;
    }
    const list = (data || []) as any as Caretaker[];
    // assignment counts
    const withCounts = await Promise.all(
      list.map(async (c) => {
        const { count } = await supabase
          .from("caretaker_assignments" as any)
          .select("*", { count: "exact", head: true })
          .eq("caretaker_id", c.id);
        return { ...c, assignment_count: count || 0 };
      })
    );
    setCaretakers(withCounts);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchCaretakers();
  }, [fetchCaretakers]);

  const createCaretaker = async (input: CaretakerInput) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase
      .from("caretakers" as any)
      .insert({ ...input, user_id: user.id } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: "Caretaker added" });
    await fetchCaretakers();
    return { error: null };
  };

  const updateCaretaker = async (id: string, input: Partial<CaretakerInput>) => {
    const { error } = await supabase
      .from("caretakers" as any)
      .update(input as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: "Caretaker updated" });
    await fetchCaretakers();
    return { error: null };
  };

  const deleteCaretaker = async (id: string) => {
    const { error } = await supabase.from("caretakers" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: "Caretaker removed" });
    await fetchCaretakers();
    return { error: null };
  };

  return { caretakers, loading, fetchCaretakers, createCaretaker, updateCaretaker, deleteCaretaker };
};
