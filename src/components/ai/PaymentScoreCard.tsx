import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Brain } from "lucide-react";
import { useAIAssistant } from "@/hooks/useAIAssistant";

interface PaymentScoreCardProps {
  tenantId: string;
  tenantName: string;
}

interface ScoreData {
  score: number;
  riskLevel: "low" | "medium" | "high";
  onTimePayments: number;
  latePayments: number;
  totalPayments: number;
  averageDaysLate: number;
}

export const PaymentScoreCard = ({ tenantId, tenantName }: PaymentScoreCardProps) => {
  const { getPaymentScore, getRiskPrediction } = useAIAssistant();
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchScore = async () => {
    setLoading(true);
    const data = await getPaymentScore(tenantId);
    if (data) {
      setScoreData(data);
    }
    setLoading(false);
  };

  const analyzeRisk = async () => {
    setAnalyzing(true);
    const data = await getRiskPrediction(tenantId);
    if (data) {
      setRiskAnalysis(data.analysis);
    }
    setAnalyzing(false);
  };

  useEffect(() => {
    fetchScore();
  }, [tenantId]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "high":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "low":
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case "high":
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Payment Score</CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchScore}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {scoreData ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tenantName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold">{scoreData.score}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>
              {getRiskBadge(scoreData.riskLevel)}
            </div>

            <Progress 
              value={scoreData.score} 
              className={`h-2 ${getRiskColor(scoreData.riskLevel)}`}
            />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-lg font-semibold">{scoreData.onTimePayments}</span>
                </div>
                <p className="text-xs text-muted-foreground">On Time</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-lg font-semibold">{scoreData.latePayments}</span>
                </div>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-lg font-semibold">{scoreData.averageDaysLate}</span>
                </div>
                <p className="text-xs text-muted-foreground">Avg Days Late</p>
              </div>
            </div>

            <Button 
              onClick={analyzeRisk} 
              disabled={analyzing}
              variant="outline" 
              className="w-full"
            >
              <Brain className="h-4 w-4 mr-2" />
              {analyzing ? "Analyzing..." : "AI Risk Analysis"}
            </Button>

            {riskAnalysis && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">AI Analysis</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{riskAnalysis}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No payment data available</p>
            <Button onClick={fetchScore} variant="outline" size="sm" className="mt-2">
              Calculate Score
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
