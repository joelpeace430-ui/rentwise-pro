import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Calculator,
  DollarSign,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useTaxData } from "@/hooks/useTaxData";
import QuarterlyTaxTracker from "@/components/tax/QuarterlyTaxTracker";
import YearOverYearChart from "@/components/tax/YearOverYearChart";
import TaxExportButton from "@/components/tax/TaxExportButton";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpenseSummary } from "@/components/expenses/ExpenseSummary";

const TaxCenter = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { taxSummary, quarterlyData, yearlyComparison, expenseCategories, isLoading } = useTaxData(selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate days until tax deadline
  const taxDeadline = new Date(selectedYear + 1, 3, 15); // April 15
  const today = new Date();
  const daysUntilDeadline = Math.max(0, Math.ceil((taxDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <DashboardLayout
      title="Tax Center"
      subtitle="Prepare your taxes with organized records and documents"
    >
      <div className="space-y-6">
        {/* Header with Year Selector and Export */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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
          </div>
          <TaxExportButton
            taxSummary={taxSummary}
            expenseCategories={expenseCategories}
            quarterlyData={quarterlyData}
            selectedYear={selectedYear}
          />
        </div>

        {/* Tax Deadline Alert */}
        <Card className="border-warning/50 bg-warning/5 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Tax Filing Deadline</p>
                <p className="text-sm text-muted-foreground">
                  April 15, {selectedYear + 1} - {daysUntilDeadline} days remaining
                </p>
              </div>
              <Button className="gap-2">
                <Calculator className="h-4 w-4" />
                Calculate Taxes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tax Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="shadow-md">
                <CardContent className="p-5">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <DollarSign className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Income</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(taxSummary.totalIncome)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                      <Receipt className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(taxSummary.totalExpenses)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net Income</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(taxSummary.netIncome)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                      <Calculator className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Tax</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(taxSummary.estimatedTax)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="quarterly" className="space-y-6">
          <TabsList>
            <TabsTrigger value="quarterly" className="gap-2">
              <Calendar className="h-4 w-4" />
              Quarterly Tracker
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2">
              <TrendingUp className="h-4 w-4" />
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
