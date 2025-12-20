import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTaxData } from "@/hooks/useTaxData";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

interface IncomeExpenseChartProps {
  selectedYear: number;
}

const IncomeExpenseChart = ({ selectedYear }: IncomeExpenseChartProps) => {
  const { quarterlyData, taxSummary, isLoading } = useTaxData(selectedYear);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Transform quarterly data for the chart
  const chartData = quarterlyData.map((q, index) => ({
    name: q.quarter,
    income: Math.max(0, q.income + (q.estimatedTax / 0.25 - q.income)), // Recalculate gross income
    expenses: q.income < 0 ? Math.abs(q.income) : 0,
    netIncome: q.income,
    estimatedTax: q.estimatedTax,
    dueDate: q.dueDate,
    isPaid: q.isPaid,
  }));

  // Calculate totals for summary
  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = taxSummary.totalExpenses;
  const growthRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background/95 p-4 shadow-xl backdrop-blur-sm">
          <p className="mb-2 font-semibold text-foreground">{label} - {data.dueDate}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Net Income
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(data.netIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Est. Tax
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(data.estimatedTax)}
              </span>
            </div>
            <div className="mt-2 border-t pt-2">
              <span className={`text-xs font-medium ${data.isPaid ? 'text-success' : 'text-warning'}`}>
                {data.isPaid ? '✓ Tax paid' : '⏳ Tax pending'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Quarterly Income & Tax Overview
            </CardTitle>
            <CardDescription className="mt-1">
              Track your quarterly income and estimated tax obligations for {selectedYear}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5">
              {growthRate >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={`text-sm font-medium ${growthRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                {growthRate.toFixed(1)}% margin
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              onMouseMove={(e) => {
                if (e.activeTooltipIndex !== undefined) {
                  setActiveIndex(e.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="netIncome"
                name="Net Income"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#colorIncome)"
                activeDot={{
                  r: 6,
                  stroke: 'hsl(var(--success))',
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                }}
              />
              <Area
                type="monotone"
                dataKey="estimatedTax"
                name="Estimated Tax"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                fill="url(#colorTax)"
                activeDot={{
                  r: 6,
                  stroke: 'hsl(var(--warning))',
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats Below Chart */}
        <div className="mt-4 grid grid-cols-4 gap-4 border-t pt-4">
          {chartData.map((quarter, index) => (
            <div
              key={quarter.name}
              className={`rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                activeIndex === index
                  ? 'bg-primary/10 ring-1 ring-primary/20'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <p className="text-xs font-medium text-muted-foreground">{quarter.name}</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatCurrency(quarter.netIncome)}
              </p>
              <p className="text-xs text-muted-foreground">
                Tax: {formatCurrency(quarter.estimatedTax)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeExpenseChart;
