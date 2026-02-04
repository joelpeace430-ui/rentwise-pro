import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Building2, Loader2 } from "lucide-react";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { formatCurrency } from "@/lib/currency";
import ReactMarkdown from "react-markdown";

interface SmartPricingCardProps {
  propertyId: string;
  propertyName: string;
}

interface PricingData {
  suggestion: string;
  vacancyRate: number;
  currentAvgRent: number;
}

export const SmartPricingCard = ({ propertyId, propertyName }: SmartPricingCardProps) => {
  const { getPricingSuggestion } = useAIAssistant();
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPricing = async () => {
    setLoading(true);
    const data = await getPricingSuggestion(propertyId);
    if (data) {
      setPricingData(data);
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Smart Pricing
        </CardTitle>
        {pricingData && (
          <Badge variant="outline">
            {pricingData.vacancyRate.toFixed(0)}% Vacancy
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">{propertyName}</span>
        </div>

        {pricingData && (
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Current Avg Rent</p>
              <p className="text-xl font-bold">{formatCurrency(pricingData.currentAvgRent)}</p>
            </div>
          </div>
        )}

        {!pricingData ? (
          <Button 
            onClick={fetchPricing} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Pricing Suggestion
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium mb-2 text-primary">AI Recommendation</p>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{pricingData.suggestion}</ReactMarkdown>
              </div>
            </div>
            <Button 
              onClick={fetchPricing} 
              disabled={loading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh Analysis"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
