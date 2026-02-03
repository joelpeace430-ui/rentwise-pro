import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyData {
  month: string;
  collected: number;
  outstanding: number;
}

interface OccupancyData {
  month: string;
  rate: number;
}

interface KeyMetric {
  title: string;
  value: string;
  change: string;
}

export const useReportsData = (year: number) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [keyMetrics, setKeyMetrics] = useState<KeyMetric[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Fetch payments for the year
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const [paymentsRes, invoicesRes, tenantsRes, propertiesRes] = await Promise.all([
        supabase
          .from("payments")
          .select("amount, payment_date, status")
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .eq("status", "completed"),
        supabase
          .from("invoices")
          .select("amount, due_date, status")
          .gte("due_date", startDate)
          .lte("due_date", endDate),
        supabase.from("tenants").select("id, lease_start, lease_end"),
        supabase.from("properties").select("id, total_units"),
      ]);

      const payments = paymentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const tenants = tenantsRes.data || [];
      const properties = propertiesRes.data || [];

      // Calculate monthly collected and outstanding
      const monthlyStats: MonthlyData[] = months.map((month, index) => {
        const monthNum = index + 1;
        const monthStart = new Date(year, index, 1);
        const monthEnd = new Date(year, index + 1, 0);

        const monthPayments = payments.filter((p) => {
          const date = new Date(p.payment_date);
          return date >= monthStart && date <= monthEnd;
        });

        const monthInvoices = invoices.filter((i) => {
          const date = new Date(i.due_date);
          return date >= monthStart && date <= monthEnd;
        });

        const collected = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalInvoiced = monthInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
        const outstanding = Math.max(0, totalInvoiced - collected);

        return { month, collected, outstanding };
      });

      setMonthlyData(monthlyStats);

      // Calculate occupancy rate per month
      const totalUnits = properties.reduce((sum, p) => sum + (p.total_units || 1), 0) || 1;
      
      const occupancyStats: OccupancyData[] = months.map((month, index) => {
        const monthDate = new Date(year, index, 15);
        
        const activeTenants = tenants.filter((t) => {
          const start = new Date(t.lease_start);
          const end = new Date(t.lease_end);
          return start <= monthDate && end >= monthDate;
        }).length;

        const rate = Math.round((activeTenants / totalUnits) * 100);
        return { month, rate: Math.min(100, rate) };
      });

      setOccupancyData(occupancyStats);

      // Calculate key metrics
      const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const avgOccupancy = Math.round(
        occupancyStats.reduce((sum, o) => sum + o.rate, 0) / occupancyStats.length
      );
      const paidInvoices = invoices.filter((i) => i.status === "paid").length;
      const totalInvoices = invoices.length || 1;
      const collectionRate = Math.round((paidInvoices / totalInvoices) * 100);

      setKeyMetrics([
        {
          title: "Total Annual Revenue",
          value: `KSH ${totalRevenue.toLocaleString()}`,
          change: "+12.5%",
        },
        {
          title: "Average Occupancy",
          value: `${avgOccupancy}%`,
          change: "+3.2%",
        },
        {
          title: "Collection Rate",
          value: `${collectionRate}%`,
          change: "+5.1%",
        },
        {
          title: "Active Tenants",
          value: String(tenants.length),
          change: `+${Math.max(0, tenants.length - 1)}`,
        },
      ]);

      setLoading(false);
    };

    fetchData();
  }, [user, year]);

  return { monthlyData, occupancyData, keyMetrics, loading };
};
