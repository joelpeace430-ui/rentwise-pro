import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Receipt, Calculator, TrendingDown } from "lucide-react";
import { useExpenses } from "@/hooks/useExpenses";

interface ExpenseSummaryProps {
  selectedYear: number;
}

const COLORS = [
  "hsl(221, 83%, 53%)", // blue
  "hsl(24, 95%, 53%)",  // orange
  "hsl(262, 83%, 58%)", // purple
  "hsl(0, 84%, 60%)",   // red
  "hsl(47, 96%, 53%)",  // yellow
  "hsl(239, 84%, 67%)", // indigo
  "hsl(215, 14%, 34%)", // slate
  "hsl(330, 81%, 60%)", // pink
  "hsl(187, 85%, 43%)", // cyan
  "hsl(142, 71%, 45%)", // green
  "hsl(38, 92%, 50%)",  // amber
  "hsl(173, 80%, 40%)", // teal
];

export const ExpenseSummary = ({ selectedYear }: ExpenseSummaryProps) => {
  const { totalExpenses, taxDeductibleTotal, expensesByCategory } = useExpenses(selectedYear);

  const chartData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          <p className="text-xs text-muted-foreground">For {selectedYear}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tax Deductible</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">{formatCurrency(taxDeductibleTotal)}</div>
          <p className="text-xs text-muted-foreground">
            {totalExpenses > 0 ? Math.round((taxDeductibleTotal / totalExpenses) * 100) : 0}% of total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estimated Tax Savings</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(taxDeductibleTotal * 0.25)}</div>
          <p className="text-xs text-muted-foreground">At 25% tax rate</p>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
