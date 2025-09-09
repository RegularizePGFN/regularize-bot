import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend = "neutral", 
  trendValue,
  className 
}: MetricCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm",
      "hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        <div className="flex items-center space-x-2">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trendValue && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend === "up" && "text-success bg-success/10",
              trend === "down" && "text-destructive bg-destructive/10",
              trend === "neutral" && "text-muted-foreground bg-muted/20"
            )}>
              {trend === "up" && "+"}{trendValue}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}