import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfYear, endOfYear, format, subYears } from "date-fns";

interface TaxSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  estimatedTax: number;
  effectiveTaxRate: number;
  monthlyTaxLiability: number;
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

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
}

// KRA Individual Tax Bands (Annual - 2024/2025)
const calculateKRATax = (annualIncome: number): number => {
  if (annualIncome <= 0) return 0;

  let tax = 0;
  const bands = [
    { limit: 288000, rate: 0.10 },
    { limit: 388000, rate: 0.25 },
    { limit: 6000000, rate: 0.30 },
    { limit: 9600000, rate: 0.325 },
    { limit: Infinity, rate: 0.35 },
  ];

  let remaining = annualIncome;
  let previousLimit = 0;

  for (const band of bands) {
    const taxableInBand = Math.min(remaining, band.limit - previousLimit);
    if (taxableInBand <= 0) break;
    tax += taxableInBand * band.rate;
    remaining -= taxableInBand;
    previousLimit = band.limit;
  }

  // Personal relief (KES 2,400 per month = 28,800 per year)
  tax = Math.max(0, tax - 28800);

  return tax;
};

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

  // Fetch expenses for the selected year
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["tax-expenses", user?.id, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, expense_date, category, is_tax_deductible")
        .eq("user_id", user?.id)
        .gte("expense_date", format(yearStart, "yyyy-MM-dd"))
        .lte("expense_date", format(yearEnd, "yyyy-MM-dd"));

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

  // Fetch historical expenses for comparison
  const { data: historicalExpenses = [] } = useQuery({
    queryKey: ["historical-expenses", user?.id],
    queryFn: async () => {
      const threeYearsAgo = subYears(new Date(), 3);
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, expense_date, is_tax_deductible")
        .eq("user_id", user?.id)
        .gte("expense_date", format(threeYearsAgo, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate actual expense totals
  const totalExpensesAmount = expenses
    .filter((e) => e.is_tax_deductible)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Calculate tax summary using KRA bands
  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const netIncome = totalIncome - totalExpensesAmount;
  const estimatedTax = calculateKRATax(netIncome);
  const effectiveTaxRate = netIncome > 0 ? (estimatedTax / netIncome) * 100 : 0;

  const taxSummary: TaxSummary = {
    totalIncome,
    totalExpenses: totalExpensesAmount,
    netIncome,
    estimatedTax,
    effectiveTaxRate,
    monthlyTaxLiability: estimatedTax / 12,
  };

  // Calculate quarterly data with KRA instalment dates
  // KRA instalment tax due: 20th of 4th, 6th, 9th, 12th months
  const quarterlyData: QuarterlyData[] = [
    { quarter: "Q1", dueDate: `Apr 20, ${selectedYear}`, isPaid: false, income: 0, estimatedTax: 0 },
    { quarter: "Q2", dueDate: `Jun 20, ${selectedYear}`, isPaid: false, income: 0, estimatedTax: 0 },
    { quarter: "Q3", dueDate: `Sep 20, ${selectedYear}`, isPaid: false, income: 0, estimatedTax: 0 },
    { quarter: "Q4", dueDate: `Dec 20, ${selectedYear}`, isPaid: false, income: 0, estimatedTax: 0 },
  ];

  payments.forEach((payment) => {
    const month = new Date(payment.payment_date).getMonth();
    const quarterIndex = Math.floor(month / 3);
    if (quarterIndex >= 0 && quarterIndex < 4) {
      quarterlyData[quarterIndex].income += Number(payment.amount);
    }
  });

  // Subtract quarterly expenses from income for tax calculation
  expenses.forEach((expense) => {
    const month = new Date(expense.expense_date).getMonth();
    const quarterIndex = Math.floor(month / 3);
    if (quarterIndex >= 0 && quarterIndex < 4 && expense.is_tax_deductible) {
      quarterlyData[quarterIndex].income -= Number(expense.amount);
    }
  });

  quarterlyData.forEach((q) => {
    // Each instalment is 25% of estimated annual tax
    q.estimatedTax = estimatedTax / 4;
  });

  // Mark past quarters as "paid" based on date
  const today = new Date();
  quarterlyData.forEach((q, index) => {
    const dueMonths = [3, 5, 8, 11]; // April, June, September, December (0-indexed)
    const dueDate = new Date(selectedYear, dueMonths[index], 20);
    if (dueDate < today) {
      q.isPaid = true;
    }
  });

  // Calculate yearly comparison with real expense data
  const yearlyComparison: YearlyComparison[] = [];
  const currentYear = new Date().getFullYear();

  for (let year = currentYear - 2; year <= currentYear; year++) {
    const yearPayments = historicalPayments.filter((p) => {
      const paymentYear = new Date(p.payment_date).getFullYear();
      return paymentYear === year;
    });

    const yearExpenses = historicalExpenses.filter((e) => {
      const expenseYear = new Date(e.expense_date).getFullYear();
      return expenseYear === year && e.is_tax_deductible;
    });

    const income = yearPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const expenseTotal = yearExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    yearlyComparison.push({
      year,
      income,
      expenses: expenseTotal,
      netIncome: income - expenseTotal,
    });
  }

  // Expense categories breakdown from real data
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.is_tax_deductible) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    }
  });

  const expenseCategories: ExpenseCategory[] = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpensesAmount > 0 ? (amount / totalExpensesAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    taxSummary,
    quarterlyData,
    yearlyComparison,
    expenseCategories,
    isLoading: paymentsLoading || expensesLoading,
    calculateKRATax,
  };
};
