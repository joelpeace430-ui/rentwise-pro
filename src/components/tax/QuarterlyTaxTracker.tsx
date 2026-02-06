import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatus = (quarter: QuarterlyData) => {
    const today = new Date();
    // Parse "Apr 20, 2026" format
    const dueDate = new Date(quarter.dueDate);

    if (quarter.isPaid) {
      return { label: "Paid", variant: "success" as const, icon: CheckCircle2 };
    }
    if (dueDate < today) {
      return { label: "Overdue", variant: "destructive" as const, icon: AlertTriangle };
    }
    return { label: "Upcoming", variant: "secondary" as const, icon: Clock };
  };

  const totalTax = data.reduce((sum, q) => sum + q.estimatedTax, 0);
  const paidCount = data.filter(q => q.isPaid).length;

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">KRA Instalment Tax Payments</CardTitle>
            <CardDescription>Track your quarterly instalment tax payments to KRA</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Annual Tax</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalTax)}</p>
            <p className="text-xs text-muted-foreground">{paidCount}/4 paid</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {data.map((quarter, index) => {
              const status = getStatus(quarter);
              return (
                <div key={quarter.quarter} className="flex-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      status.label === "Paid"
                        ? "bg-success"
                        : status.label === "Overdue"
                        ? "bg-destructive"
                        : "bg-muted"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Quarter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.map((quarter) => {
              const status = getStatus(quarter);
              const StatusIcon = status.icon;

              return (
                <div
                  key={quarter.quarter}
                  className={`relative rounded-xl border p-5 transition-all hover:shadow-md ${
                    status.label === "Paid"
                      ? "border-success/30 bg-success/5"
                      : status.label === "Overdue"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm ${
                          status.label === "Paid"
                            ? "bg-success/20 text-success"
                            : status.label === "Overdue"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {quarter.quarter}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Due: {quarter.dueDate}</p>
                        <p className="text-xs text-muted-foreground">
                          Net Income: {formatCurrency(quarter.income)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={status.variant === "success" ? "default" : status.variant}
                      className={`${
                        status.variant === "success"
                          ? "bg-success/20 text-success border-success/30"
                          : ""
                      } gap-1`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Instalment Amount</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(quarter.estimatedTax)}
                      </p>
                    </div>
                    {!quarter.isPaid && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs">
                        Pay via iTax
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuarterlyTaxTracker;
