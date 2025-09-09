import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Download, 
  Eye,
  Building2,
  User
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Job {
  id: string;
  cnpj: string;
  responsavelNome: string;
  email: string;
  status: "pending" | "processing" | "completed" | "failed";
  etapaAtual?: string;
  progresso: number;
  tempoInicio: Date;
  tempoFim?: Date;
  tempoEstimado?: number;
  comprovante?: string;
  error?: string;
}

interface JobsListProps {
  jobs: Job[];
  onViewDetails: (jobId: string) => void;
  onDownloadComprovante: (jobId: string) => void;
}

const statusConfig = {
  pending: {
    label: "Aguardando",
    color: "secondary",
    icon: Clock,
    bgColor: "bg-muted/20",
  },
  processing: {
    label: "Processando",
    color: "default",
    icon: Clock,
    bgColor: "bg-primary/10",
  },
  completed: {
    label: "Concluído",
    color: "default",
    icon: CheckCircle2,
    bgColor: "bg-success/10",
  },
  failed: {
    label: "Falhou",
    color: "destructive",
    icon: AlertCircle,
    bgColor: "bg-destructive/10",
  },
} as const;

export function JobsList({ jobs, onViewDetails, onDownloadComprovante }: JobsListProps) {
  const formatTempo = (inicio: Date, fim?: Date) => {
    if (fim) {
      const duracao = fim.getTime() - inicio.getTime();
      const minutos = Math.floor(duracao / 60000);
      const segundos = Math.floor((duracao % 60000) / 1000);
      return `${minutos}min ${segundos}s`;
    }
    return format(inicio, "HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Jobs de Cadastro</h2>
        <Badge variant="outline" className="text-muted-foreground">
          {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
        </Badge>
      </div>

      {jobs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum job cadastrado</h3>
            <p className="text-muted-foreground">
              Crie um novo cadastro para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const config = statusConfig[job.status];
            const StatusIcon = config.icon;
            
            return (
              <Card 
                key={job.id} 
                className={`border-border/50 ${config.bgColor} backdrop-blur-sm hover:bg-opacity-80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {job.cnpj}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {job.responsavelNome} • {job.email}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={config.color} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{formatTempo(job.tempoInicio, job.tempoFim)}</div>
                        <div>{format(job.tempoInicio, "dd/MM HH:mm", { locale: ptBR })}</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  {job.status === "processing" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{job.etapaAtual}</span>
                        <span className="font-medium">{job.progresso}%</span>
                      </div>
                      <Progress value={job.progresso} className="h-2" />
                      {job.tempoEstimado && (
                        <div className="text-xs text-muted-foreground">
                          Tempo estimado: {job.tempoEstimado} minutos
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {job.status === "failed" && job.error && (
                    <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2 text-sm text-destructive mb-1">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Erro no processamento</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{job.error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(job.id)}
                      className="rounded-2xl"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Detalhes
                    </Button>

                    {job.status === "completed" && job.comprovante && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownloadComprovante(job.id)}
                        className="rounded-2xl text-success hover:text-success"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Comprovante
                      </Button>
                    )}

                    <div className="flex-1" />

                    {job.status === "completed" && (
                      <Badge className="bg-success/10 text-success border-success/20">
                        Sucesso
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}