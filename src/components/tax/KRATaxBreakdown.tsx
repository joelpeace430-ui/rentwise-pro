import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calculator, TrendingUp, TrendingDown, Minus, Target, Shield, Zap, FileCheck } from "lucide-react";
import { useTaxData } from "@/hooks/useTaxData";

interface KRATaxBreakdownProps {
  selectedYear: number;
}

const KRATaxBreakdown = ({ selectedYear }: KRATaxBreakdownProps) => {
  const { taxSummary } = useTaxData(selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // KRA Tax Bands for display
  const taxBands = [
    { range: "0 – 288,000", rate: "10%", limit: 288000 },
    { range: "288,001 – 388,000", rate: "25%", limit: 388000 },
    { range: "388,001 – 6,000,000", rate: "30%", limit: 6000000 },
    { range: "6,000,001 – 9,600,000", rate: "32.5%", limit: 9600000 },
    { range: "Above 9,600,000", rate: "35%", limit: Infinity },
  ];

  // Determine which band the income falls into
  const activeBandIndex = taxBands.findIndex((band) => taxSummary.netIncome <= band.limit);
  const currentBand = activeBandIndex >= 0 ? activeBandIndex : taxBands.length - 1;

  const metrics = [
    {
      label: "Effective Tax Rate",
      value: `${taxSummary.effectiveTaxRate.toFixed(1)}%`,
      icon: Target,
      trend: taxSummary.effectiveTaxRate <= 20 ? "up" : taxSummary.effectiveTaxRate <= 25 ? "neutral" : "down",
    },
    {
      label: "Monthly Liability",
      value: formatCurrency(taxSummary.monthlyTaxLiability),
      icon: Shield,
      trend: "neutral" as const,
    },
    {
      label: "Personal Relief",
      value: formatCurrency(28800),
      icon: Zap,
      trend: "up" as const,
    },
  ];

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/80 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              KRA Tax Computation
            </CardTitle>
            <CardDescription>Automatic tax calculation using Kenya Revenue Authority bands</CardDescription>
          </div>
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary border-primary/20"
          >
            {selectedYear} Tax Year
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tax Band Visualization */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">KRA Individual Tax Bands</h4>
          {taxBands.map((band, index) => {
            const isActive = index === currentBand;
            const isPassed = index < currentBand;
            return (
              <div
                key={band.range}
                className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                  isActive
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                    : isPassed
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isPassed
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      KES {band.range}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {band.rate}
                  </span>
                  {isActive && (
                    <Badge className="bg-primary/20 text-primary text-xs border-0">Current</Badge>
                  )}
                  {isPassed && (
                    <Badge className="bg-success/20 text-success text-xs border-0">✓</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center space-y-1">
              <div className="flex justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <metric.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-lg font-bold text-foreground">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <div className="flex justify-center">
                {metric.trend === "up" && <TrendingUp className="h-3 w-3 text-success" />}
                {metric.trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
                {metric.trend === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
              </div>
            </div>
          ))}
        </div>

        {/* Tax Computation Summary */}
        <div className="rounded-lg bg-muted/30 p-4 space-y-3">
          <h4 className="text-sm font-medium">Computation Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Rental Income</span>
              <span className="font-medium">{formatCurrency(taxSummary.totalIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Less: Allowable Expenses</span>
              <span className="font-medium text-destructive">({formatCurrency(taxSummary.totalExpenses)})</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="text-muted-foreground">Taxable Income</span>
              <span className="font-bold">{formatCurrency(taxSummary.netIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax Before Relief</span>
              <span className="font-medium">{formatCurrency(taxSummary.estimatedTax + 28800)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Less: Personal Relief</span>
              <span className="font-medium text-success">({formatCurrency(28800)})</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold text-foreground">Net Tax Payable</span>
              <span className="font-bold text-primary text-lg">{formatCurrency(taxSummary.estimatedTax)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KRATaxBreakdown;
