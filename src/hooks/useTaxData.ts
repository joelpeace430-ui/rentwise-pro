import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfYear, endOfYear, format, subYears } from "date-fns";

interface TaxSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  estimatedTax: number;
}

interface QuarterlyData {
  quarter: string;
  income: number;
  estimatedTax: number;
  dueDate: string;
  isPaid: boolean;
}

interface YearlyComparison {
  year: number;
  income: number;
  expenses: number;
  netIncome: number;
}

export const useTaxData = (selectedYear: number = new Date().getFullYear()) => {
  const { user } = useAuth();

  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));

  // Fetch payments for income
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["tax-payments", user?.id, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, payment_date, status")
        .eq("user_id", user?.id)
        .gte("payment_date", format(yearStart, "yyyy-MM-dd"))
        .lte("payment_date", format(yearEnd, "yyyy-MM-dd"))
        .eq("status", "completed");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch historical data for comparison (last 3 years)
  const { data: historicalPayments = [] } = useQuery({
    queryKey: ["historical-payments", user?.id],
    queryFn: async () => {
      const threeYearsAgo = subYears(new Date(), 3);
      const { data, error } = await supabase
        .from("payments")
        .select("amount, payment_date, status")
        .eq("user_id", user?.id)
        .gte("payment_date", format(threeYearsAgo, "yyyy-MM-dd"))
        .eq("status", "completed");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate tax summary
  const taxSummary: TaxSummary = {
    totalIncome: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    totalExpenses: payments.reduce((sum, p) => sum + Number(p.amount), 0) * 0.25, // Estimated 25% expenses
    netIncome: 0,
    estimatedTax: 0,
  };
  taxSummary.netIncome = taxSummary.totalIncome - taxSummary.totalExpenses;
  taxSummary.estimatedTax = taxSummary.netIncome * 0.25; // 25% tax rate estimate

  // Calculate quarterly data
  const quarterlyData: QuarterlyData[] = [
    { quarter: "Q1", dueDate: `April 15, ${selectedYear}`, isPaid: false, income: 0, estimatedTax: 0 },
    { quarter: "Q2", dueDate: `June 15, ${selectedYear}`, isPaid: false, income: 0, estimatedTax: 0 },
    { quarter: "Q3", dueDate: `September 15, ${selectedYear}`, isPaid: false, income: 0, estimatedTax: 0 },
    { quarter: "Q4", dueDate: `January 15, ${selectedYear + 1}`, isPaid: false, income: 0, estimatedTax: 0 },
  ];

  payments.forEach((payment) => {
    const month = new Date(payment.payment_date).getMonth();
    const quarterIndex = Math.floor(month / 3);
    if (quarterIndex >= 0 && quarterIndex < 4) {
      quarterlyData[quarterIndex].income += Number(payment.amount);
      quarterlyData[quarterIndex].estimatedTax = quarterlyData[quarterIndex].income * 0.25;
    }
  });

  // Mark past quarters as "paid" based on date
  const today = new Date();
  quarterlyData.forEach((q, index) => {
    const dueDateParts = q.dueDate.split(", ");
    const dueYear = parseInt(dueDateParts[1]);
    if (dueYear < today.getFullYear() || (dueYear === today.getFullYear() && index < Math.floor(today.getMonth() / 3))) {
      q.isPaid = true;
    }
  });

  // Calculate yearly comparison
  const yearlyComparison: YearlyComparison[] = [];
  const currentYear = new Date().getFullYear();
  
  for (let year = currentYear - 2; year <= currentYear; year++) {
    const yearPayments = historicalPayments.filter((p) => {
      const paymentYear = new Date(p.payment_date).getFullYear();
      return paymentYear === year;
    });
    
    const income = yearPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const expenses = income * 0.25;
    
    yearlyComparison.push({
      year,
      income,
      expenses,
      netIncome: income - expenses,
    });
  }

  // Expense categories breakdown
  const expenseCategories = [
    { category: "Property Maintenance", percentage: 25 },
    { category: "Management Fees", percentage: 19 },
    { category: "Insurance", percentage: 16 },
    { category: "Property Taxes", percentage: 24 },
    { category: "Utilities", percentage: 10 },
    { category: "Professional Fees", percentage: 6 },
  ].map((cat) => ({
    ...cat,
    amount: taxSummary.totalExpenses * (cat.percentage / 100),
  }));

  return {
    taxSummary,
    quarterlyData,
    yearlyComparison,
    expenseCategories,
    isLoading: paymentsLoading,
  };
};
