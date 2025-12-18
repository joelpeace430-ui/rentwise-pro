import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface YearlyData {
  year: number;
  income: number;
  expenses: number;
  netIncome: number;
}

interface YearOverYearChartProps {
  data: YearlyData[];
}

const YearOverYearChart = ({ data }: YearOverYearChartProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  const chartData = data.map((d) => ({
    year: d.year.toString(),
    Income: d.income,
    Expenses: d.expenses,
    "Net Income": d.netIncome,
  }));

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Year-over-Year Comparison</CardTitle>
        <CardDescription>Compare your financial performance across years</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" className="text-muted-foreground" />
              <YAxis tickFormatter={formatCurrency} className="text-muted-foreground" />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(value)
                }
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="Income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Net Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Cards */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {data.map((yearData) => (
            <div
              key={yearData.year}
              className="rounded-lg border border-border p-3 text-center"
            >
              <p className="text-sm font-medium text-muted-foreground">{yearData.year}</p>
              <p className="text-lg font-bold text-foreground">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                }).format(yearData.netIncome)}
              </p>
              <p className="text-xs text-muted-foreground">Net Income</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default YearOverYearChart;
