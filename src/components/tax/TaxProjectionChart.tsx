import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";
import { useTaxData } from "@/hooks/useTaxData";

interface TaxProjectionChartProps {
  selectedYear: number;
}

const TaxProjectionChart = ({ selectedYear }: TaxProjectionChartProps) => {
  const { quarterlyData, taxSummary } = useTaxData(selectedYear);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const completedQuarters = quarterlyData.filter((_, idx) => idx <= currentQuarter);
  const totalQuarterlyIncome = completedQuarters.reduce((sum, q) => sum + q.income, 0);
  const avgMonthlyIncome = completedQuarters.length > 0
    ? totalQuarterlyIncome / (completedQuarters.length * 3)
    : 0;
  const avgMonthlyTax = avgMonthlyIncome > 0 ? taxSummary.estimatedTax / 12 : 0;

  const chartData = months.map((month, idx) => {
    const quarterIdx = Math.floor(idx / 3);
    const isCompleted = quarterIdx < currentQuarter || (quarterIdx === currentQuarter && idx <= currentMonth);

    let cumulativeIncome = 0;
    let cumulativeTax = 0;

    for (let i = 0; i <= idx; i++) {
      const qIdx = Math.floor(i / 3);
      if (qIdx <= currentQuarter && quarterlyData[qIdx]) {
        cumulativeIncome += quarterlyData[qIdx].income / 3;
        cumulativeTax += quarterlyData[qIdx].estimatedTax / 3;
      } else if (avgMonthlyIncome > 0) {
        cumulativeIncome += avgMonthlyIncome;
        cumulativeTax += avgMonthlyTax;
      }
    }

    return {
      month,
      actualTax: isCompleted ? cumulativeTax : null,
      projectedTax: !isCompleted ? cumulativeTax : null,
      actualIncome: isCompleted ? cumulativeIncome : null,
      projectedIncome: !isCompleted ? cumulativeIncome : null,
      isProjected: !isCompleted,
    };
  });

  const projectedYearEndTax = chartData[11]?.projectedTax || chartData[11]?.actualTax || taxSummary.estimatedTax;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const tax = data?.actualTax ?? data?.projectedTax ?? 0;
      const income = data?.actualIncome ?? data?.projectedIncome ?? 0;
      const isProjected = data?.isProjected;

      return (
        <div className="rounded-xl border bg-card p-3 shadow-lg">
          <p className="font-medium text-foreground">{label} {selectedYear}</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">
                Income{isProjected ? " (projected)" : ""}:
              </span>
              <span className="font-medium">{formatCurrency(income)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-muted-foreground">
                Tax{isProjected ? " (projected)" : ""}:
              </span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
          </div>
          {isProjected && (
            <p className="mt-2 text-xs text-muted-foreground italic">Based on current trends</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tax Projection
            </CardTitle>
            <CardDescription>Cumulative KRA tax liability for {selectedYear}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Year-End:</span>
              <span className="font-bold text-warning">{formatCurrency(projectedYearEndTax)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Based on current trends
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="taxGradientKE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="incomeGradientKE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="actualIncome" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#incomeGradientKE)" connectNulls={false} />
              <Line type="monotone" dataKey="projectedIncome" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
              <Area type="monotone" dataKey="actualTax" stroke="hsl(var(--warning))" strokeWidth={2} fill="url(#taxGradientKE)" connectNulls={false} />
              <Line type="monotone" dataKey="projectedTax" stroke="hsl(var(--warning))" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
              <ReferenceLine
                x={months[currentMonth]}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{ value: "Today", position: "top", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-6 rounded bg-primary" />
            <span className="text-muted-foreground">Income (actual)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 border-t-2 border-dashed border-primary" />
            <span className="text-muted-foreground">Income (projected)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-6 rounded bg-warning" />
            <span className="text-muted-foreground">Tax (actual)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 border-t-2 border-dashed border-warning" />
            <span className="text-muted-foreground">Tax (projected)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxProjectionChart;
