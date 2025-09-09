import { MetricCard } from "./MetricCard";
import { TrendingUp, CheckCircle, Clock, DollarSign } from "lucide-react";

interface DashboardMetricsProps {
  metrics: {
    cadastrosHoje: number;
    taxaSucesso: number;
    tempoMedio: number;
    custoPorCadastro: number;
  };
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <MetricCard
        title="Cadastros Hoje"
        value={metrics.cadastrosHoje.toString()}
        subtitle="cadastros processados"
        icon={TrendingUp}
        trend="up"
        trendValue="12%"
        className="animate-fade-in"
      />
      
      <MetricCard
        title="Taxa de Sucesso"
        value={`${metrics.taxaSucesso}%`}
        subtitle="aprovação média"
        icon={CheckCircle}
        trend="up"
        trendValue="2.5%"
        className="animate-fade-in [animation-delay:0.1s]"
      />
      
      <MetricCard
        title="Tempo Médio"
        value={`${metrics.tempoMedio}min`}
        subtitle="por cadastro"
        icon={Clock}
        trend="down"
        trendValue="15s"
        className="animate-fade-in [animation-delay:0.2s]"
      />
      
      <MetricCard
        title="Custo por Cadastro"
        value={`R$ ${metrics.custoPorCadastro.toFixed(2)}`}
        subtitle="valor unitário"
        icon={DollarSign}
        trend="neutral"
        className="animate-fade-in [animation-delay:0.3s]"
      />
    </div>
  );
}