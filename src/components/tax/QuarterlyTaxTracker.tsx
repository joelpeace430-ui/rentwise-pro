import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface QuarterlyData {
  quarter: string;
  income: number;
  estimatedTax: number;
  dueDate: string;
  isPaid: boolean;
}

interface QuarterlyTaxTrackerProps {
  data: QuarterlyData[];
}

const QuarterlyTaxTracker = ({ data }: QuarterlyTaxTrackerProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatus = (quarter: QuarterlyData) => {
    const today = new Date();
    const dueDateParts = quarter.dueDate.split(" ");
    const dueDate = new Date(`${dueDateParts[0]} ${dueDateParts[1].replace(",", "")} ${dueDateParts[2]}`);
    
    if (quarter.isPaid) {
      return { label: "Paid", variant: "success" as const, icon: CheckCircle2 };
    }
    if (dueDate < today) {
      return { label: "Overdue", variant: "destructive" as const, icon: AlertTriangle };
    }
    return { label: "Upcoming", variant: "secondary" as const, icon: Clock };
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Quarterly Tax Payments</CardTitle>
        <CardDescription>Track your estimated quarterly tax payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((quarter) => {
            const status = getStatus(quarter);
            const StatusIcon = status.icon;
            
            return (
              <div
                key={quarter.quarter}
                className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="font-semibold text-primary">{quarter.quarter}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Due: {quarter.dueDate}</p>
                    <p className="text-sm text-muted-foreground">
                      Income: {formatCurrency(quarter.income)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(quarter.estimatedTax)}
                    </p>
                    <p className="text-xs text-muted-foreground">Estimated Tax</p>
                  </div>
                  <Badge
                    variant={status.variant === "success" ? "default" : status.variant}
                    className={status.variant === "success" ? "bg-success text-success-foreground" : ""}
                  >
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuarterlyTaxTracker;
