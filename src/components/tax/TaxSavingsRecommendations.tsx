import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  Home, 
  Car, 
  Briefcase, 
  FileText, 
  Wrench,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useTaxData } from "@/hooks/useTaxData";
import { useExpenses } from "@/hooks/useExpenses";

interface TaxSavingsRecommendationsProps {
  selectedYear: number;
}

const TaxSavingsRecommendations = ({ selectedYear }: TaxSavingsRecommendationsProps) => {
  const { taxSummary, expenseCategories } = useTaxData(selectedYear);
  const { expenses } = useExpenses(selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate smart recommendations based on current data
  const generateRecommendations = () => {
    const recommendations = [];
    const existingCategories = expenseCategories.map(c => c.category.toLowerCase());

    // Check for missing common deduction categories
    const commonCategories = [
      { 
        name: "Repairs & Maintenance", 
        key: "repairs", 
        icon: Wrench,
        potentialSavings: taxSummary.totalIncome * 0.05,
        description: "Track all property repairs and maintenance for deductions"
      },
      { 
        name: "Home Office", 
        key: "home office", 
        icon: Home,
        potentialSavings: 1500,
        description: "If you work from home, deduct a portion of home expenses"
      },
      { 
        name: "Vehicle Expenses", 
        key: "vehicle", 
        icon: Car,
        potentialSavings: 2000,
        description: "Track mileage for property visits and management activities"
      },
      { 
        name: "Professional Services", 
        key: "professional", 
        icon: Briefcase,
        potentialSavings: 1000,
        description: "Legal, accounting, and property management fees are deductible"
      },
      { 
        name: "Insurance Premiums", 
        key: "insurance", 
        icon: FileText,
        potentialSavings: taxSummary.totalIncome * 0.03,
        description: "Property and liability insurance premiums are fully deductible"
      },
    ];

    commonCategories.forEach(category => {
      const hasCategory = existingCategories.some(c => 
        c.includes(category.key) || category.key.includes(c)
      );
      
      if (!hasCategory) {
        recommendations.push({
          ...category,
          status: "missing",
          priority: category.potentialSavings > 1500 ? "high" : "medium",
        });
      }
    });

    // Add recommendation for low deduction rate
    const deductionRate = taxSummary.totalIncome > 0 
      ? (taxSummary.totalExpenses / taxSummary.totalIncome) * 100 
      : 0;

    if (deductionRate < 15 && taxSummary.totalIncome > 0) {
      recommendations.unshift({
        name: "Increase Deductions",
        key: "increase",
        icon: DollarSign,
        potentialSavings: (taxSummary.totalIncome * 0.15 - taxSummary.totalExpenses) * 0.25,
        description: `Your deduction rate is ${deductionRate.toFixed(1)}%. Most landlords deduct 15-30% of income.`,
        status: "action",
        priority: "high",
      });
    }

    // Check for non-deductible expenses that could be converted
    const nonDeductibleCount = expenses?.filter(e => !e.is_tax_deductible).length || 0;
    if (nonDeductibleCount > 3) {
      recommendations.push({
        name: "Review Non-Deductible Items",
        key: "review",
        icon: AlertCircle,
        potentialSavings: 500,
        description: `You have ${nonDeductibleCount} expenses marked as non-deductible. Review if any qualify.`,
        status: "review",
        priority: "medium",
      });
    }

    return recommendations.slice(0, 5);
  };

  const recommendations = generateRecommendations();
  const totalPotentialSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive/20 text-destructive border-destructive/30";
      case "medium": return "bg-warning/20 text-warning border-warning/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "missing": return <AlertCircle className="h-4 w-4" />;
      case "action": return <ArrowRight className="h-4 w-4" />;
      case "review": return <FileText className="h-4 w-4" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              Tax Savings Recommendations
            </CardTitle>
            <CardDescription>Opportunities to reduce your tax liability</CardDescription>
          </div>
          {totalPotentialSavings > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Potential Savings</p>
              <p className="text-lg font-bold text-success">{formatCurrency(totalPotentialSavings)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="text-muted-foreground">Great job! You're maximizing your deductions.</p>
          </div>
        ) : (
          recommendations.map((rec, index) => (
            <div 
              key={rec.key}
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <rec.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{rec.name}</h4>
                  <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
                {rec.potentialSavings > 0 && (
                  <p className="text-xs text-success mt-1">
                    Potential savings: {formatCurrency(rec.potentialSavings)}
                  </p>
                )}
              </div>
              <div className="flex items-center text-muted-foreground">
                {getStatusIcon(rec.status)}
              </div>
            </div>
          ))
        )}

        {recommendations.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Optimization potential</span>
              <span className="font-medium">{Math.min(100, recommendations.length * 20)}%</span>
            </div>
            <Progress 
              value={100 - Math.min(100, recommendations.length * 20)} 
              className="mt-2 h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxSavingsRecommendations;
