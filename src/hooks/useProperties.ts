import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string;
  total_units: number;
  status: "active" | "maintenance";
  created_at: string;
  updated_at: string;
  occupied_units?: number;
}

export interface CreatePropertyInput {
  name: string;
  address: string;
  total_units: number;
  status?: "active" | "maintenance";
}

export const useProperties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProperties = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } else {
      // Get tenant counts for each property
      const propertiesWithCounts = await Promise.all(
        (data || []).map(async (property) => {
          const { count } = await supabase
            .from("tenants")
            .select("*", { count: "exact", head: true })
            .eq("property_id", property.id);
          return { ...property, occupied_units: count || 0 };
        })
      );
      setProperties(propertiesWithCounts as Property[]);
    }
    setLoading(false);
  };

  const createProperty = async (input: CreatePropertyInput) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("properties")
      .insert({
        ...input,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create property",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Property created successfully",
    });
    await fetchProperties();
    return { data };
  };

  const updateProperty = async (id: string, input: Partial<CreatePropertyInput>) => {
    const { error } = await supabase
      .from("properties")
      .update(input)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Property updated successfully",
    });
    await fetchProperties();
    return { error: null };
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete property. Make sure no tenants are assigned.",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Property deleted successfully",
    });
    await fetchProperties();
    return { error: null };
  };

  useEffect(() => {
    fetchProperties();
  }, [user]);

  return {
    properties,
    loading,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
  };
};
