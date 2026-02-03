import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Download, TrendingUp, DollarSign, Home, Users, Loader2 } from "lucide-react";
import { useReportsData } from "@/hooks/useReportsData";

const Reports = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const { monthlyData, occupancyData, keyMetrics, loading } = useReportsData(Number(selectedYear));

  const metricIcons = [DollarSign, Home, TrendingUp, Users];

  if (loading) {
    return (
      <DashboardLayout
        title="Reports"
        subtitle="Financial analytics and performance insights"
      >
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Reports"
      subtitle="Financial analytics and performance insights"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
              <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
              <SelectItem value={String(currentYear - 2)}>{currentYear - 2}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {keyMetrics.map((metric, index) => {
            const Icon = metricIcons[index] || DollarSign;
            return (
              <Card key={metric.title} className="shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{metric.title}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {metric.value}
                      </p>
                      <p className="text-sm text-success mt-1">{metric.change} YoY</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 && monthlyData.some(d => d.collected > 0 || d.outstanding > 0) ? (
                <>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`KSH ${value.toLocaleString()}`, ""]}
                        />
                        <Bar
                          dataKey="collected"
                          fill="hsl(142, 71%, 45%)"
                          radius={[4, 4, 0, 0]}
                          name="Collected"
                        />
                        <Bar
                          dataKey="outstanding"
                          fill="hsl(38, 92%, 50%)"
                          radius={[4, 4, 0, 0]}
                          name="Outstanding"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-success" />
                      <span className="text-sm text-muted-foreground">Collected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-warning" />
                      <span className="text-sm text-muted-foreground">Outstanding</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No revenue data for {selectedYear}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Occupancy Chart */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {occupancyData.length > 0 && occupancyData.some(d => d.rate > 0) ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value}%`, "Occupancy"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="hsl(222, 47%, 20%)"
                        strokeWidth={3}
                        dot={{ fill: "hsl(222, 47%, 20%)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "hsl(43, 96%, 56%)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No occupancy data for {selectedYear}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
