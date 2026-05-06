import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles, AppRole } from "@/hooks/useUserRoles";

export type FeatureKey = "finance" | "tax" | "expenses" | "reports" | "maintenance";

export const FEATURE_LABELS: Record<FeatureKey, { label: string; description: string }> = {
  finance: { label: "Finance", description: "Payments, invoices, debts" },
  tax: { label: "Tax Center", description: "KRA tax tracking and reports" },
  expenses: { label: "Expenses", description: "Track and categorize expenses" },
  reports: { label: "Reports", description: "Financial and performance reports" },
  maintenance: { label: "Maintenance", description: "Maintenance request tracking" },
};

export const ALL_FEATURES: FeatureKey[] = ["finance", "tax", "expenses", "reports", "maintenance"];
export const ALL_ROLES: AppRole[] = ["admin", "landlord", "finance", "agent", "caretaker"];

export interface FeatureToggle {
  id: string;
  role: AppRole;
  feature_key: string;
  enabled: boolean;
}

export const useFeatureToggles = () => {
  const { user } = useAuth();
  const { roles, isAdmin } = useUserRoles();
  const [toggles, setToggles] = useState<FeatureToggle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchToggles = useCallback(async () => {
    if (!user) {
      setToggles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_toggles")
      .select("id, role, feature_key, enabled");
    if (!error && data) {
      setToggles(data as FeatureToggle[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchToggles();
  }, [fetchToggles]);

  /**
   * Returns true if ANY of the user's roles has the feature enabled.
   * Admin always has every feature enabled.
   */
  const isFeatureEnabled = (feature: FeatureKey): boolean => {
    if (isAdmin()) return true;
    if (roles.length === 0) return false;
    return toggles.some(
      (t) => t.feature_key === feature && t.enabled && roles.includes(t.role)
    );
  };

  const setToggle = async (role: AppRole, feature: FeatureKey, enabled: boolean) => {
    const { error } = await supabase
      .from("feature_toggles")
      .upsert(
        { role, feature_key: feature, enabled, updated_by: user?.id },
        { onConflict: "role,feature_key" }
      );
    if (!error) {
      setToggles((prev) => {
        const idx = prev.findIndex((t) => t.role === role && t.feature_key === feature);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], enabled };
          return next;
        }
        return [...prev, { id: crypto.randomUUID(), role, feature_key: feature, enabled }];
      });
    }
    return { error };
  };

  return { toggles, loading, isFeatureEnabled, setToggle, refetch: fetchToggles };
};
