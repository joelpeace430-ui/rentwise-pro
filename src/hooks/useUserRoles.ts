import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type AppRole = "admin" | "landlord" | "agent" | "caretaker";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  assigned_by: string | null;
  assigned_properties: string[];
  created_at: string;
  updated_at: string;
}

export const useUserRoles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching roles:", error);
        // Default to landlord if no roles found
        setRoles(["landlord"]);
      } else {
        const userRoles = data?.map(r => r.role as AppRole) || ["landlord"];
        setRoles(userRoles.length > 0 ? userRoles : ["landlord"]);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      setRoles(["landlord"]);
    }
    setLoading(false);
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const isAdmin = (): boolean => hasRole("admin");
  const isLandlord = (): boolean => hasRole("landlord");
  const isAgent = (): boolean => hasRole("agent");
  const isCaretaker = (): boolean => hasRole("caretaker");

  const canManageProperties = (): boolean => {
    return isAdmin() || isLandlord();
  };

  const canManageTenants = (): boolean => {
    return isAdmin() || isLandlord() || isAgent();
  };

  const canViewFinancials = (): boolean => {
    return isAdmin() || isLandlord();
  };

  const canManageUsers = (): boolean => {
    return isAdmin();
  };

  const assignRole = async (userId: string, role: AppRole, assignedProperties: string[] = []) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
        assigned_by: user.id,
        assigned_properties: assignedProperties,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: `Role ${role} assigned successfully`,
    });
    return { error: null };
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: `Role ${role} removed successfully`,
    });
    return { error: null };
  };

  useEffect(() => {
    fetchRoles();
  }, [user]);

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isLandlord,
    isAgent,
    isCaretaker,
    canManageProperties,
    canManageTenants,
    canViewFinancials,
    canManageUsers,
    assignRole,
    removeRole,
    fetchRoles,
  };
};
