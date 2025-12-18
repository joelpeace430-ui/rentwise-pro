import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface TaxData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  estimatedTax: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface QuarterlyData {
  quarter: string;
  income: number;
  estimatedTax: number;
  dueDate: string;
  isPaid: boolean;
}

interface TaxExportButtonProps {
  taxSummary: TaxData;
  expenseCategories: ExpenseCategory[];
  quarterlyData: QuarterlyData[];
  selectedYear: number;
}

const TaxExportButton = ({
  taxSummary,
  expenseCategories,
  quarterlyData,
  selectedYear,
}: TaxExportButtonProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const exportToCSV = () => {
    const rows = [
      ["Tax Summary Report", selectedYear.toString()],
      [""],
      ["SUMMARY"],
      ["Total Income", formatCurrency(taxSummary.totalIncome)],
      ["Total Expenses", formatCurrency(taxSummary.totalExpenses)],
      ["Net Income", formatCurrency(taxSummary.netIncome)],
      ["Estimated Tax", formatCurrency(taxSummary.estimatedTax)],
      [""],
      ["EXPENSE BREAKDOWN"],
      ["Category", "Amount", "Percentage"],
      ...expenseCategories.map((e) => [
        e.category,
        formatCurrency(e.amount),
        `${e.percentage}%`,
      ]),
      [""],
      ["QUARTERLY PAYMENTS"],
      ["Quarter", "Due Date", "Income", "Estimated Tax", "Status"],
      ...quarterlyData.map((q) => [
        q.quarter,
        q.dueDate,
        formatCurrency(q.income),
        formatCurrency(q.estimatedTax),
        q.isPaid ? "Paid" : "Pending",
      ]),
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tax-report-${selectedYear}.csv`;
    link.click();
    toast.success("CSV report downloaded successfully");
  };

  const exportToPDF = () => {
    // Create a printable HTML document
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tax Report ${selectedYear}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1a1a2e; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }
          h2 { color: #1a1a2e; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #1a1a2e; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px; }
          .summary-card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
          .summary-card h3 { margin: 0; color: #666; font-size: 14px; }
          .summary-card p { margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #1a1a2e; }
          .paid { color: #22c55e; }
          .pending { color: #f59e0b; }
        </style>
      </head>
      <body>
        <h1>Tax Report - ${selectedYear}</h1>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Income</h3>
            <p>${formatCurrency(taxSummary.totalIncome)}</p>
          </div>
          <div class="summary-card">
            <h3>Total Expenses</h3>
            <p>${formatCurrency(taxSummary.totalExpenses)}</p>
          </div>
          <div class="summary-card">
            <h3>Net Income</h3>
            <p>${formatCurrency(taxSummary.netIncome)}</p>
          </div>
          <div class="summary-card">
            <h3>Estimated Tax</h3>
            <p>${formatCurrency(taxSummary.estimatedTax)}</p>
          </div>
        </div>
        
        <h2>Expense Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${expenseCategories
              .map(
                (e) => `
              <tr>
                <td>${e.category}</td>
                <td>${formatCurrency(e.amount)}</td>
                <td>${e.percentage}%</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <h2>Quarterly Tax Payments</h2>
        <table>
          <thead>
            <tr>
              <th>Quarter</th>
              <th>Due Date</th>
              <th>Income</th>
              <th>Estimated Tax</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${quarterlyData
              .map(
                (q) => `
              <tr>
                <td>${q.quarter}</td>
                <td>${q.dueDate}</td>
                <td>${formatCurrency(q.income)}</td>
                <td>${formatCurrency(q.estimatedTax)}</td>
                <td class="${q.isPaid ? "paid" : "pending"}">${q.isPaid ? "Paid" : "Pending"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <p style="margin-top: 40px; color: #666; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString()} | RentFlow Tax Center
        </p>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("PDF report ready for printing");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TaxExportButton;
