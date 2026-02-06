import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Calculator,
  TrendingUp,
  Receipt,
  Wallet,
  BarChart3,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useTaxData } from "@/hooks/useTaxData";
import QuarterlyTaxTracker from "@/components/tax/QuarterlyTaxTracker";
import YearOverYearChart from "@/components/tax/YearOverYearChart";
import IncomeExpenseChart from "@/components/tax/IncomeExpenseChart";
import TaxProjectionChart from "@/components/tax/TaxProjectionChart";
import TaxExportButton from "@/components/tax/TaxExportButton";
import TaxCalendar from "@/components/tax/TaxCalendar";
import KRATaxBreakdown from "@/components/tax/KRATaxBreakdown";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpenseSummary } from "@/components/expenses/ExpenseSummary";

const TaxCenter = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { taxSummary, quarterlyData, yearlyComparison, expenseCategories, isLoading } = useTaxData(selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // KRA filing deadline - June 30 of following year
  const kraDeadline = new Date(selectedYear + 1, 5, 30);
  const today = new Date();
  const daysUntilDeadline = Math.max(0, Math.ceil((kraDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const isUrgent = daysUntilDeadline <= 30;

  const years = [currentYear, currentYear - 1, currentYear - 2];

  // Calculate changes from previous period
  const prevYearData = yearlyComparison.find(y => y.year === selectedYear - 1);
  const incomeChange = prevYearData && prevYearData.income > 0
    ? ((taxSummary.totalIncome - prevYearData.income) / prevYearData.income) * 100
    : 0;

  return (
    <DashboardLayout
      title="KRA Tax Center"
      subtitle="Automated tax computation using Kenya Revenue Authority tax bands"
    >
      <div className="space-y-6">
        {/* Header with Year Selector and Export */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="gap-1">
              <Calculator className="h-3 w-3" />
              Auto-calculated
            </Badge>
          </div>
          <TaxExportButton
            taxSummary={taxSummary}
            expenseCategories={expenseCategories}
            quarterlyData={quarterlyData}
            selectedYear={selectedYear}
          />
        </div>

        {/* KRA Filing Deadline Banner */}
        <Card className={`border-0 shadow-lg overflow-hidden ${isUrgent ? 'bg-gradient-to-r from-destructive/10 to-warning/10' : 'bg-gradient-to-r from-primary/5 to-accent/5'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isUrgent ? 'bg-destructive/20' : 'bg-primary/10'}`}>
                  <FileText className={`h-6 w-6 ${isUrgent ? 'text-destructive' : 'text-primary'}`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">KRA Individual Tax Return</p>
                  <p className="text-sm text-muted-foreground">
                    Filing deadline: June 30, {selectedYear + 1} •{" "}
                    <span className={isUrgent ? "text-destructive font-medium" : "text-primary font-medium"}>
                      {daysUntilDeadline} days remaining
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">Estimated Tax Due</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(taxSummary.estimatedTax)}</p>
                </div>
                <Button className="gap-2 shadow-md">
                  <Calculator className="h-4 w-4" />
                  File on iTax
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="shadow-md border-0">
                <CardContent className="p-5">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="shadow-md border-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-success/5 rounded-bl-[4rem]" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Gross Income</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {formatCurrency(taxSummary.totalIncome)}
                      </p>
                      {incomeChange !== 0 && (
                        <div className={`flex items-center gap-1 mt-2 text-xs ${incomeChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {incomeChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(incomeChange).toFixed(1)}% vs last year
                        </div>
                      )}
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10">
                      <Wallet className="h-5 w-5 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-destructive/5 rounded-bl-[4rem]" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Allowable Expenses</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {formatCurrency(taxSummary.totalExpenses)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {taxSummary.totalIncome > 0 ? ((taxSummary.totalExpenses / taxSummary.totalIncome) * 100).toFixed(1) : 0}% of income
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10">
                      <Receipt className="h-5 w-5 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[4rem]" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxable Income</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {formatCurrency(taxSummary.netIncome)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">After deductions</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 relative overflow-hidden bg-gradient-to-br from-card to-primary/5">
                <div className="absolute top-0 right-0 w-20 h-20 bg-warning/5 rounded-bl-[4rem]" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">KRA Tax Due</p>
                      <p className="text-2xl font-bold text-primary mt-1">
                        {formatCurrency(taxSummary.estimatedTax)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Effective rate: {taxSummary.effectiveTaxRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10">
                      <Calculator className="h-5 w-5 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* KRA Tax Breakdown + Calendar */}
        <div className="grid gap-6 lg:grid-cols-3">
          <KRATaxBreakdown selectedYear={selectedYear} />
          <TaxCalendar selectedYear={selectedYear} />
        </div>

        {/* Interactive Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <IncomeExpenseChart selectedYear={selectedYear} />
          <TaxProjectionChart selectedYear={selectedYear} />
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="quarterly" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="quarterly" className="gap-2">
              <Calendar className="h-4 w-4" />
              Instalment Tax
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Year Comparison
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quarterly">
            <QuarterlyTaxTracker data={quarterlyData} />
          </TabsContent>

          <TabsContent value="comparison">
            <YearOverYearChart data={yearlyComparison} />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <ExpenseSummary selectedYear={selectedYear} />
            <ExpenseList selectedYear={selectedYear} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TaxCenter;
