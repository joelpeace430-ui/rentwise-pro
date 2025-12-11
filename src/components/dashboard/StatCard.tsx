import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    trend: "up" | "down";
  };
  icon: LucideIcon;
  variant?: "default" | "accent";
  className?: string;
}

const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  variant = "default",
  className,
}: StatCardProps) => {
  const isAccent = variant === "accent";

  return (
    <div
      className={cn(
        isAccent ? "stat-card-accent" : "stat-card",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              "text-sm font-medium",
              isAccent ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "text-3xl font-bold tracking-tight",
              isAccent ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-1">
              {change.trend === "up" ? (
                <TrendingUp className={cn("h-4 w-4", isAccent ? "text-primary-foreground/80" : "text-success")} />
              ) : (
                <TrendingDown className={cn("h-4 w-4", isAccent ? "text-primary-foreground/80" : "text-destructive")} />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isAccent
                    ? "text-primary-foreground/80"
                    : change.trend === "up"
                    ? "text-success"
                    : "text-destructive"
                )}
              >
                {change.value}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isAccent ? "text-primary-foreground/60" : "text-muted-foreground"
                )}
              >
                vs last month
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            isAccent ? "bg-primary-foreground/10" : "bg-accent/10"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              isAccent ? "text-primary-foreground" : "text-accent"
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
