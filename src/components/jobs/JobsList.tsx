import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Download,
  Building2,
  User,
  Mail,
  Timer,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Cadastro } from "@/lib/mockData";

interface JobsListProps {
  onJobUpdate?: () => void;
}

export function JobsList({ onJobUpdate }: JobsListProps) {
  const [jobs, setJobs] = useState<Cadastro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('cadastros')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs((data || []) as Cadastro[]);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('cadastros-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'cadastros' },
        () => {
          fetchJobs();
          onJobUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onJobUpdate]);

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando cadastros...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: Cadastro["status"]) => {
    switch (status) {
      case "pending": return Clock;
      case "processing": return Loader2;
      case "completed": return CheckCircle2;
      case "failed": return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: Cadastro["status"]) => {
    switch (status) {
      case "pending": return "secondary";
      case "processing": return "default";
      case "completed": return "default";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusText = (status: Cadastro["status"]) => {
    switch (status) {
      case "pending": return "Aguardando";
      case "processing": return "Processando";
      case "completed": return "Concluído";
      case "failed": return "Falhou";
      default: return "Desconhecido";
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">Cadastros Recentes</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            className="h-8"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Badge variant="outline" className="bg-background/50">
            {jobs.length} cadastros
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{
        jobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum cadastro encontrado</p>
          </div>
        ) : (
          jobs.map((job) => {
            const StatusIcon = getStatusIcon(job.status);
            const statusColor = getStatusColor(job.status);
            const statusText = getStatusText(job.status);

            return (
              <Card key={job.id} className="border-border/30 bg-card/30 hover:bg-card/50 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={statusColor} className="flex items-center gap-1">
                      <StatusIcon className={`h-3 w-3 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                      {statusText}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {job.progresso}%
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{job.cnpj}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{job.cpf}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{job.email}</span>
                    </div>
                  </div>

                  {job.status === "processing" && (
                    <div className="space-y-2">
                      <Progress value={job.progresso} className="h-2" />
                      <p className="text-sm text-muted-foreground">{job.etapa_atual}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Iniciado {formatDistanceToNow(new Date(job.tempo_inicio), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                    
                    {job.status === "completed" && job.comprovante_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-2xl"
                        onClick={() => window.open(job.comprovante_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Comprovante
                      </Button>
                    )}
                  </div>

                  {job.status === "failed" && job.error_message && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                      <p className="text-sm text-destructive">{job.error_message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )
      }</CardContent>
    </Card>
  );
}