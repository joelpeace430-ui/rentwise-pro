import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MoreHorizontal, FileText, Download, Send } from "lucide-react";

const invoices = [
  {
    id: "INV-2024-001",
    tenant: "Sarah Johnson",
    property: "Maple Street Apartments #204",
    amount: "$1,450.00",
    issueDate: "Dec 1, 2024",
    dueDate: "Dec 10, 2024",
    status: "paid",
  },
  {
    id: "INV-2024-002",
    tenant: "Michael Chen",
    property: "Oak Ridge Condos #512",
    amount: "$2,100.00",
    issueDate: "Dec 1, 2024",
    dueDate: "Dec 10, 2024",
    status: "paid",
  },
  {
    id: "INV-2024-003",
    tenant: "Emily Davis",
    property: "Sunset Villas #103",
    amount: "$1,800.00",
    issueDate: "Dec 1, 2024",
    dueDate: "Dec 10, 2024",
    status: "pending",
  },
  {
    id: "INV-2024-004",
    tenant: "James Wilson",
    property: "Downtown Lofts #701",
    amount: "$2,500.00",
    issueDate: "Nov 1, 2024",
    dueDate: "Nov 10, 2024",
    status: "overdue",
  },
  {
    id: "INV-2024-005",
    tenant: "Amanda Lee",
    property: "Riverfront Suites #302",
    amount: "$1,950.00",
    issueDate: "Dec 1, 2024",
    dueDate: "Dec 10, 2024",
    status: "paid",
  },
  {
    id: "INV-2024-006",
    tenant: "Robert Martinez",
    property: "Pine Grove #108",
    amount: "$1,600.00",
    issueDate: "Dec 1, 2024",
    dueDate: "Dec 15, 2024",
    status: "pending",
  },
];

const Invoices = () => {
  return (
    <DashboardLayout
      title="Invoices"
      subtitle="Create and manage tenant invoices"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search invoices..."
                className="pl-9"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {/* Invoices Table */}
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[140px]">Invoice ID</TableHead>
                  <TableHead>Tenant / Property</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{invoice.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {invoice.tenant}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.property}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {invoice.amount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.issueDate}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.dueDate}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          invoice.status === "paid"
                            ? "badge-success"
                            : invoice.status === "pending"
                            ? "badge-warning"
                            : "badge-destructive"
                        }
                      >
                        {invoice.status === "paid"
                          ? "Paid"
                          : invoice.status === "pending"
                          ? "Pending"
                          : "Overdue"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <FileText className="h-4 w-4" />
                            View Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Download className="h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Send className="h-4 w-4" />
                            Send Reminder
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Void Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

export default Invoices;
