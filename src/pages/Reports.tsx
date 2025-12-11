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
import { Download, TrendingUp, DollarSign, Home, Users } from "lucide-react";

const monthlyData = [
  { month: "Jan", collected: 42000, outstanding: 8000 },
  { month: "Feb", collected: 45000, outstanding: 6500 },
  { month: "Mar", collected: 48000, outstanding: 7200 },
  { month: "Apr", collected: 46000, outstanding: 5800 },
  { month: "May", collected: 52000, outstanding: 4500 },
  { month: "Jun", collected: 55000, outstanding: 6000 },
  { month: "Jul", collected: 58000, outstanding: 5200 },
  { month: "Aug", collected: 56000, outstanding: 4800 },
  { month: "Sep", collected: 62000, outstanding: 5500 },
  { month: "Oct", collected: 65000, outstanding: 4200 },
  { month: "Nov", collected: 68000, outstanding: 3800 },
  { month: "Dec", collected: 72000, outstanding: 4500 },
];

const occupancyData = [
  { month: "Jan", rate: 85 },
  { month: "Feb", rate: 87 },
  { month: "Mar", rate: 88 },
  { month: "Apr", rate: 90 },
  { month: "May", rate: 92 },
  { month: "Jun", rate: 94 },
  { month: "Jul", rate: 93 },
  { month: "Aug", rate: 95 },
  { month: "Sep", rate: 96 },
  { month: "Oct", rate: 94 },
  { month: "Nov", rate: 95 },
  { month: "Dec", rate: 96 },
];

const keyMetrics = [
  {
    title: "Total Annual Revenue",
    value: "$669,000",
    change: "+15.2%",
    icon: DollarSign,
  },
  {
    title: "Average Occupancy",
    value: "92%",
    change: "+4.5%",
    icon: Home,
  },
  {
    title: "Collection Rate",
    value: "94.2%",
    change: "+2.8%",
    icon: TrendingUp,
  },
  {
    title: "Active Tenants",
    value: "42",
    change: "+8",
    icon: Users,
  },
];

const Reports = () => {
  return (
    <DashboardLayout
      title="Reports"
      subtitle="Financial analytics and performance insights"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Select defaultValue="2024">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
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
          {keyMetrics.map((metric) => (
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
                    <metric.icon className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
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
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
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
            </CardContent>
          </Card>

          {/* Occupancy Chart */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
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
                      domain={[80, 100]}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
