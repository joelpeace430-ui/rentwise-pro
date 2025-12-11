import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";

const payments = [
  {
    id: "PAY-2024-001",
    tenant: "Sarah Johnson",
    property: "Maple Street Apartments #204",
    amount: "$1,450.00",
    method: "Bank Transfer",
    date: "Dec 10, 2024",
    status: "completed",
  },
  {
    id: "PAY-2024-002",
    tenant: "Michael Chen",
    property: "Oak Ridge Condos #512",
    amount: "$2,100.00",
    method: "Credit Card",
    date: "Dec 9, 2024",
    status: "completed",
  },
  {
    id: "PAY-2024-003",
    tenant: "Emily Davis",
    property: "Sunset Villas #103",
    amount: "$1,800.00",
    method: "ACH",
    date: "Dec 8, 2024",
    status: "processing",
  },
  {
    id: "PAY-2024-004",
    tenant: "Amanda Lee",
    property: "Riverfront Suites #302",
    amount: "$1,950.00",
    method: "Bank Transfer",
    date: "Dec 5, 2024",
    status: "completed",
  },
  {
    id: "PAY-2024-005",
    tenant: "David Kim",
    property: "Mountain Vista #201",
    amount: "$1,850.00",
    method: "Credit Card",
    date: "Dec 3, 2024",
    status: "failed",
  },
];

const summaryStats = [
  {
    title: "Collected This Month",
    value: "$68,450",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Processing",
    value: "$5,600",
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Failed Payments",
    value: "$3,700",
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
];

const Payments = () => {
  return (
    <DashboardLayout
      title="Payments"
      subtitle="Track and manage all payment transactions"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {summaryStats.map((stat) => (
            <Card key={stat.title} className="shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search payments..."
                className="pl-9"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Payments Table */}
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[140px]">Payment ID</TableHead>
                  <TableHead>Tenant / Property</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="table-row-hover">
                    <TableCell>
                      <span className="font-mono text-sm">{payment.id}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {payment.tenant}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.property}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {payment.amount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{payment.method}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.date}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          payment.status === "completed"
                            ? "badge-success"
                            : payment.status === "processing"
                            ? "badge-warning"
                            : "badge-destructive"
                        }
                      >
                        {payment.status === "completed"
                          ? "Completed"
                          : payment.status === "processing"
                          ? "Processing"
                          : "Failed"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Payments;
