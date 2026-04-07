import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AgentDashboardStats {
  totalProperties: number;
  totalTenants: number;
  occupancyRate: number;
  totalRentCollected: number;
  totalCommissionEarned: number;
  pendingPayments: number;
}

export interface AgentProperty {
  id: string;
  name: string;
  address: string;
  total_units: number;
  status: string;
  user_id: string;
  landlord_email?: string;
  commission_type: string;
  commission_rate: number;
  occupied_units: number;
  total_rent: number;
}

export interface AgentCommission {
  id: string;
  property_id: string;
  property_name: string;
  landlord_email: string;
  commission_type: string;
  commission_rate: number;
  total_collected: number;
  commission_earned: number;
}

export const useAgentData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AgentDashboardStats | null>(null);
  const [properties, setProperties] = useState<AgentProperty[]>([]);
  const [commissions, setCommissions] = useState<AgentCommission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get agent's commission assignments
      const { data: commissionData } = await supabase
        .from("agent_commissions")
        .select("*, property:properties(id, name, address, total_units, status, user_id)")
        .eq("agent_user_id", user.id);

      const agentCommissions = commissionData || [];
      const propertyIds = agentCommissions.map((c: any) => c.property_id);

      if (propertyIds.length === 0) {
        setStats({
          totalProperties: 0,
          totalTenants: 0,
          occupancyRate: 0,
          totalRentCollected: 0,
          totalCommissionEarned: 0,
          pendingPayments: 0,
        });
        setProperties([]);
        setCommissions([]);
        setLoading(false);
        return;
      }

      // Fetch tenants and payments for assigned properties
      const [tenantsRes, paymentsRes, invoicesRes, profilesRes] = await Promise.all([
        supabase.from("tenants").select("*").in("property_id", propertyIds),
        supabase.from("payments").select("*").eq("status", "completed"),
        supabase.from("invoices").select("*").in("tenant_id",
          (await supabase.from("tenants").select("id").in("property_id", propertyIds)).data?.map((t: any) => t.id) || []
        ),
        supabase.from("profiles").select("user_id, email, first_name, last_name"),
      ]);

      const tenants = tenantsRes.data || [];
      const payments = paymentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const profiles = profilesRes.data || [];

      const tenantIds = tenants.map(t => t.id);
      const relevantPayments = payments.filter(p => tenantIds.includes(p.tenant_id));

      const totalRentCollected = relevantPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalUnits = agentCommissions.reduce((sum: number, c: any) => sum + (c.property?.total_units || 0), 0);
      const occupancyRate = totalUnits > 0 ? Math.round((tenants.length / totalUnits) * 100) : 0;

      const pendingInvoices = invoices.filter(i => i.status === "pending" || i.status === "overdue");

      // Calculate commissions per property
      let totalCommission = 0;
      const commissionDetails: AgentCommission[] = agentCommissions.map((c: any) => {
        const propTenants = tenants.filter(t => t.property_id === c.property_id);
        const propTenantIds = propTenants.map(t => t.id);
        const propPayments = relevantPayments.filter(p => propTenantIds.includes(p.tenant_id));
        const propCollected = propPayments.reduce((sum, p) => sum + Number(p.amount), 0);

        let earned = 0;
        if (c.commission_type === "percentage") {
          earned = propCollected * (Number(c.commission_rate) / 100);
        } else {
          earned = Number(c.commission_rate);
        }
        totalCommission += earned;

        const landlordProfile = profiles.find(p => p.user_id === c.landlord_user_id);

        return {
          id: c.id,
          property_id: c.property_id,
          property_name: c.property?.name || "Unknown",
          landlord_email: landlordProfile?.email || "Unknown",
          commission_type: c.commission_type,
          commission_rate: Number(c.commission_rate),
          total_collected: propCollected,
          commission_earned: earned,
        };
      });

      // Build property list with occupancy
      const agentProperties: AgentProperty[] = agentCommissions.map((c: any) => {
        const propTenants = tenants.filter(t => t.property_id === c.property_id);
        const propTenantIds = propTenants.map(t => t.id);
        const propPayments = relevantPayments.filter(p => propTenantIds.includes(p.tenant_id));
        const totalRent = propPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const landlordProfile = profiles.find(p => p.user_id === c.landlord_user_id);

        return {
          id: c.property?.id || c.property_id,
          name: c.property?.name || "Unknown",
          address: c.property?.address || "",
          total_units: c.property?.total_units || 0,
          status: c.property?.status || "active",
          user_id: c.landlord_user_id,
          landlord_email: landlordProfile?.email || "Unknown",
          commission_type: c.commission_type,
          commission_rate: Number(c.commission_rate),
          occupied_units: propTenants.length,
          total_rent: totalRent,
        };
      });

      setStats({
        totalProperties: propertyIds.length,
        totalTenants: tenants.length,
        occupancyRate,
        totalRentCollected,
        totalCommissionEarned: totalCommission,
        pendingPayments: pendingInvoices.length,
      });
      setProperties(agentProperties);
      setCommissions(commissionDetails);
    } catch (error) {
      console.error("Error fetching agent data:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return { stats, properties, commissions, loading, refetch: fetchData };
};
