import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStats {
  totalRevenue: number;
  totalProperties: number;
  totalTenants: number;
  pendingInvoices: number;
  recentPayments: Array<{
    id: string;
    tenant_name: string;
    tenant_initials: string;
    property: string;
    amount: number;
    date: string;
  }>;
  upcomingPayments: Array<{
    id: string;
    tenant_name: string;
    property: string;
    amount: number;
    due_date: string;
    days_until: number;
  }>;
  overduePayments: Array<{
    id: string;
    tenant_name: string;
    property: string;
    amount: number;
    due_date: string;
    days_overdue: number;
  }>;
  paymentStatusData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Fetch all data in parallel
      const [propertiesRes, tenantsRes, invoicesRes, paymentsRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("tenants").select("*, property:properties(name)"),
        supabase.from("invoices").select("*, tenant:tenants(first_name, last_name, unit_number, property:properties(name))"),
        supabase.from("payments").select("*, tenant:tenants(first_name, last_name, unit_number, property:properties(name))").order("payment_date", { ascending: false }).limit(5),
      ]);

      const properties = propertiesRes.data || [];
      const tenants = tenantsRes.data || [];
      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];

      // Calculate total revenue (completed payments)
      const allPayments = (await supabase.from("payments").select("amount, status")).data || [];
      const totalRevenue = allPayments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Count pending invoices
      const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue").length;

      // Payment status distribution
      const paidCount = invoices.filter((i) => i.status === "paid").length;
      const pendingCount = invoices.filter((i) => i.status === "pending").length;
      const overdueCount = invoices.filter((i) => i.status === "overdue").length;
      const totalInvoices = invoices.length || 1;

      const paymentStatusData = [
        { name: "Paid", value: Math.round((paidCount / totalInvoices) * 100), color: "hsl(142, 71%, 45%)" },
        { name: "Pending", value: Math.round((pendingCount / totalInvoices) * 100), color: "hsl(38, 92%, 50%)" },
        { name: "Overdue", value: Math.round((overdueCount / totalInvoices) * 100), color: "hsl(0, 84%, 60%)" },
      ];

      // Recent payments
      const recentPayments = payments.map((p: any) => ({
        id: p.id,
        tenant_name: `${p.tenant?.first_name || ""} ${p.tenant?.last_name || ""}`.trim(),
        tenant_initials: `${(p.tenant?.first_name || "U")[0]}${(p.tenant?.last_name || "")[0] || ""}`.toUpperCase(),
        property: `${p.tenant?.property?.name || ""} ${p.tenant?.unit_number || ""}`.trim(),
        amount: Number(p.amount),
        date: p.payment_date,
      }));

      // Upcoming and overdue invoices
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingPayments = invoices
        .filter((i) => i.status === "pending" && new Date(i.due_date) >= today)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 3)
        .map((i: any) => {
          const dueDate = new Date(i.due_date);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: i.id,
            tenant_name: `${i.tenant?.first_name || ""} ${i.tenant?.last_name || ""}`.trim(),
            property: `${i.tenant?.property?.name || ""} ${i.tenant?.unit_number || ""}`.trim(),
            amount: Number(i.amount),
            due_date: i.due_date,
            days_until: daysUntil,
          };
        });

      const overduePayments = invoices
        .filter((i) => i.status === "overdue" || (i.status === "pending" && new Date(i.due_date) < today))
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 2)
        .map((i: any) => {
          const dueDate = new Date(i.due_date);
          const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: i.id,
            tenant_name: `${i.tenant?.first_name || ""} ${i.tenant?.last_name || ""}`.trim(),
            property: `${i.tenant?.property?.name || ""} ${i.tenant?.unit_number || ""}`.trim(),
            amount: Number(i.amount),
            due_date: i.due_date,
            days_overdue: Math.max(0, daysOverdue),
          };
        });

      setStats({
        totalRevenue,
        totalProperties: properties.length,
        totalTenants: tenants.length,
        pendingInvoices,
        recentPayments,
        upcomingPayments,
        overduePayments,
        paymentStatusData,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  return { stats, loading, refetch: fetchStats };
};
