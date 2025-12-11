import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Calculator,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Receipt,
} from "lucide-react";

const taxSummary = {
  totalIncome: "$669,000",
  totalExpenses: "$178,500",
  netIncome: "$490,500",
  estimatedTax: "$122,625",
};

const deductibleExpenses = [
  { category: "Property Maintenance", amount: "$45,200", percentage: 25 },
  { category: "Property Management Fees", amount: "$33,450", percentage: 19 },
  { category: "Insurance Premiums", amount: "$28,800", percentage: 16 },
  { category: "Property Taxes", amount: "$42,000", percentage: 24 },
  { category: "Utilities (Common Areas)", amount: "$18,050", percentage: 10 },
  { category: "Legal & Professional Fees", amount: "$11,000", percentage: 6 },
];

const taxDocuments = [
  {
    name: "1099-MISC Forms",
    description: "Income from rental properties",
    status: "ready",
    year: "2024",
  },
  {
    name: "Schedule E",
    description: "Supplemental income and loss",
    status: "ready",
    year: "2024",
  },
  {
    name: "Depreciation Schedule",
    description: "Property depreciation records",
    status: "ready",
    year: "2024",
  },
  {
    name: "Expense Summary",
    description: "Itemized deductible expenses",
    status: "pending",
    year: "2024",
  },
];

const TaxCenter = () => {
  return (
    <DashboardLayout
      title="Tax Center"
      subtitle="Prepare your taxes with organized records and documents"
    >
      <div className="space-y-6">
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
                  April 15, 2025 - 125 days remaining
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
          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-xl font-bold text-foreground">
                    {taxSummary.totalIncome}
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
                    {taxSummary.totalExpenses}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Income</p>
                  <p className="text-xl font-bold text-foreground">
                    {taxSummary.netIncome}
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
                    {taxSummary.estimatedTax}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Deductible Expenses */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Deductible Expenses</CardTitle>
              <CardDescription>
                Breakdown of tax-deductible expenses for 2024
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deductibleExpenses.map((expense) => (
                <div key={expense.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      {expense.category}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {expense.amount}
                    </span>
                  </div>
                  <Progress value={expense.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tax Documents */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Tax Documents</CardTitle>
              <CardDescription>
                Download your tax forms and supporting documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxDocuments.map((doc) => (
                    <TableRow key={doc.name} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">
                              {doc.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.status === "ready" ? (
                          <span className="badge-success flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="badge-warning flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          disabled={doc.status !== "ready"}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TaxCenter;
