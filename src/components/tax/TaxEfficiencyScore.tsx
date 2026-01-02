import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Zap, Target, Shield, Lightbulb } from "lucide-react";
import { useTaxData } from "@/hooks/useTaxData";

interface TaxEfficiencyScoreProps {
  selectedYear: number;
}

const TaxEfficiencyScore = ({ selectedYear }: TaxEfficiencyScoreProps) => {
  const { taxSummary, expenseCategories } = useTaxData(selectedYear);

  // Calculate efficiency metrics
  const deductionRate = taxSummary.totalIncome > 0 
    ? (taxSummary.totalExpenses / taxSummary.totalIncome) * 100 
    : 0;
  
  const effectiveTaxRate = taxSummary.totalIncome > 0 
    ? (taxSummary.estimatedTax / taxSummary.totalIncome) * 100 
    : 0;

  const taxSavings = taxSummary.totalExpenses * 0.25; // Estimated savings from deductions

  // Calculate overall efficiency score (0-100)
  const calculateScore = () => {
    let score = 50; // Base score
    
    // Deduction rate contribution (higher deductions = better)
    if (deductionRate >= 30) score += 25;
    else if (deductionRate >= 20) score += 15;
    else if (deductionRate >= 10) score += 10;
    else score += deductionRate / 2;
    
    // Category diversity bonus
    const categoryCount = expenseCategories.length;
    if (categoryCount >= 5) score += 15;
    else if (categoryCount >= 3) score += 10;
    else score += categoryCount * 3;
    
    // Lower effective tax rate bonus
    if (effectiveTaxRate < 15) score += 10;
    else if (effectiveTaxRate < 20) score += 5;
    
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const score = calculateScore();

  const getScoreColor = () => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = () => {
    if (score >= 80) return { label: "Excellent", variant: "success" as const };
    if (score >= 60) return { label: "Good", variant: "default" as const };
    if (score >= 40) return { label: "Fair", variant: "warning" as const };
    return { label: "Needs Improvement", variant: "destructive" as const };
  };

  const getProgressColor = () => {
    if (score >= 80) return "bg-success";
    if (score >= 60) return "bg-primary";
    if (score >= 40) return "bg-warning";
    return "bg-destructive";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const metrics = [
    {
      label: "Deduction Rate",
      value: `${deductionRate.toFixed(1)}%`,
      icon: Target,
      description: "Percentage of income offset by deductions",
      trend: deductionRate >= 20 ? "up" : deductionRate >= 10 ? "neutral" : "down",
    },
    {
      label: "Effective Tax Rate",
      value: `${effectiveTaxRate.toFixed(1)}%`,
      icon: Shield,
      description: "Your actual tax rate after deductions",
      trend: effectiveTaxRate <= 20 ? "up" : effectiveTaxRate <= 25 ? "neutral" : "down",
    },
    {
      label: "Tax Savings",
      value: formatCurrency(taxSavings),
      icon: Zap,
      description: "Estimated savings from deductions",
      trend: taxSavings > 0 ? "up" : "neutral",
    },
  ];

  const scoreInfo = getScoreLabel();

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              Tax Efficiency Score
            </CardTitle>
            <CardDescription>How well you're optimizing your tax position</CardDescription>
          </div>
          <Badge variant={scoreInfo.variant === "success" ? "default" : scoreInfo.variant === "warning" ? "secondary" : "destructive"} className={scoreInfo.variant === "success" ? "bg-success/20 text-success border-success/30" : ""}>
            {scoreInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex items-center gap-6">
          <div className="relative flex items-center justify-center">
            <svg className="w-28 h-28 -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                className="stroke-muted fill-none"
                strokeWidth="8"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                className={`fill-none ${getProgressColor().replace('bg-', 'stroke-')}`}
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 301.6} 301.6`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getScoreColor()}`}>{score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{metric.value}</span>
                  {metric.trend === "up" && <TrendingUp className="h-3 w-3 text-success" />}
                  {metric.trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
                  {metric.trend === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Optimization Progress</span>
            <span>{score}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${getProgressColor()} transition-all duration-500 rounded-full`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxEfficiencyScore;
