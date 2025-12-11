import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Tenant {
  id: string;
  user_id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  unit_number: string;
  monthly_rent: number;
  lease_start: string;
  lease_end: string;
  rent_status: "paid" | "pending" | "overdue";
  created_at: string;
  updated_at: string;
  property?: {
    name: string;
  };
}

export interface CreateTenantInput {
  property_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  unit_number: string;
  monthly_rent: number;
  lease_start: string;
  lease_end: string;
  rent_status?: "paid" | "pending" | "overdue";
}

export const useTenants = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        *,
        property:properties(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tenants:", error);
      toast({
        title: "Error",
        description: "Failed to load tenants",
        variant: "destructive",
      });
    } else {
      setTenants(data as Tenant[]);
    }
    setLoading(false);
  };

  const createTenant = async (input: CreateTenantInput) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("tenants")
      .insert({
        ...input,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create tenant",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Tenant created successfully",
    });
    await fetchTenants();
    return { data };
  };

  const updateTenant = async (id: string, input: Partial<CreateTenantInput>) => {
    const { error } = await supabase
      .from("tenants")
      .update(input)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update tenant",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Tenant updated successfully",
    });
    await fetchTenants();
    return { error: null };
  };

  const deleteTenant = async (id: string) => {
    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete tenant",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Tenant deleted successfully",
    });
    await fetchTenants();
    return { error: null };
  };

  useEffect(() => {
    fetchTenants();
  }, [user]);

  return {
    tenants,
    loading,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
  };
};
