import { MetricCard } from "./MetricCard";
import { TrendingUp, CheckCircle, Clock } from "lucide-react";

interface DashboardMetricsProps {
  metrics: {
    cadastrosHoje: number;
    taxaSucesso: number;
    tempoMedio: number;
  };
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3 mb-8">
      <MetricCard
        title="Cadastros Hoje"
        value={metrics.cadastrosHoje.toString()}
        subtitle="cadastros processados"
        icon={TrendingUp}
        className="animate-fade-in"
      />
      
      <MetricCard
        title="Taxa de Sucesso"
        value={`${metrics.taxaSucesso.toFixed(1)}%`}
        subtitle="aprovação média"
        icon={CheckCircle}
        className="animate-fade-in [animation-delay:0.1s]"
      />
      
      <MetricCard
        title="Tempo Médio"
        value={`${metrics.tempoMedio.toFixed(1)}min`}
        subtitle="por cadastro"
        icon={Clock}
        className="animate-fade-in [animation-delay:0.2s]"
      />
    </div>
  );
}