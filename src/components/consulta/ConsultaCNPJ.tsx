import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertCircle, Search, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ConsultaResult {
  cnpj: string;
  hasRegistration: boolean | null;
  status: 'success' | 'error';
  message: string;
  finalUrl?: string;
  method?: string;
  evidence?: string;
  timestamp?: string;
}

interface ConsultaJob {
  id: string;
  cnpjs: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: ConsultaResult[] | null;
  error_message: string | null;
  progress: number;
  total: number;
  created_at: string;
  updated_at: string;
}

interface ConsultaCNPJProps {
  onContinue: (cnpjsWithoutRegistration: string[]) => void;
}

export function ConsultaCNPJ({ onContinue }: ConsultaCNPJProps) {
  const [singleCNPJ, setSingleCNPJ] = useState("");
  const [multipleCNPJs, setMultipleCNPJs] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<ConsultaJob | null>(null);
  const [results, setResults] = useState<ConsultaResult[]>([]);
  const { toast } = useToast();

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const extractCNPJs = (text: string): string[] => {
    const cnpjRegex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
    const matches = text.match(cnpjRegex) || [];
    return [...new Set(matches.map(cnpj => cnpj.replace(/\D/g, '')))];
  };

  // Poll job status
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await supabase.functions.invoke('consulta-cnpj', {
          body: { jobId: currentJob.id }
        });

        if (response.error) throw response.error;

        const { job } = response.data;
        setCurrentJob(job);

        if (job.results) {
          setResults(job.results);
        }

        if (job.status === 'completed') {
          toast({
            title: "Consulta Finalizada",
            description: `${job.progress} CNPJs processados com sucesso.`,
          });
          setIsLoading(false);
        } else if (job.status === 'failed') {
          toast({
            title: "Erro na Consulta",
            description: job.error_message || "Erro desconhecido",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentJob, toast]);

  const handleConsulta = async (cnpjs: string[]) => {
    if (cnpjs.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum CNPJ válido encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    setCurrentJob(null);

    try {
      const response = await supabase.functions.invoke('consulta-cnpj', {
        body: { cnpjs }
      });

      if (response.error) throw response.error;

      const { jobId } = response.data;
      
      // Set initial job state
      setCurrentJob({
        id: jobId,
        cnpjs,
        status: 'pending',
        results: null,
        error_message: null,
        progress: 0,
        total: cnpjs.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Consulta Iniciada",
        description: `Processando ${cnpjs.length} CNPJs...`,
      });

    } catch (error) {
      console.error('Error starting CNPJ consultation:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar consulta. Tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSingleConsulta = () => {
    const cnpj = singleCNPJ.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      toast({
        title: "Erro",
        description: "CNPJ deve ter 14 dígitos",
        variant: "destructive",
      });
      return;
    }
    handleConsulta([cnpj]);
  };

  const handleMultipleConsulta = () => {
    const cnpjs = extractCNPJs(multipleCNPJs);
    handleConsulta(cnpjs);
  };

  const handleContinueWithoutRegistration = () => {
    const cnpjsWithoutRegistration = results
      .filter(result => result.status === 'success' && !result.hasRegistration)
      .map(result => result.cnpj);

    if (cnpjsWithoutRegistration.length === 0) {
      toast({
        title: "Nenhum CNPJ Disponível",
        description: "Todos os CNPJs consultados já possuem cadastro na Regularize",
        variant: "destructive",
      });
      return;
    }

    onContinue(cnpjsWithoutRegistration);
  };

  const getJobStatusIcon = () => {
    if (!currentJob) return null;
    
    switch (currentJob.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getJobStatusText = () => {
    if (!currentJob) return '';
    
    switch (currentJob.status) {
      case 'pending':
        return 'Aguardando processamento...';
      case 'processing':
        return `Processando ${currentJob.progress}/${currentJob.total} CNPJs...`;
      case 'completed':
        return 'Consulta finalizada';
      case 'failed':
        return 'Erro no processamento';
      default:
        return '';
    }
  };

  const getStatusIcon = (result: ConsultaResult) => {
    if (result.status === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (result.hasRegistration) return <XCircle className="h-4 w-4 text-destructive" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusBadge = (result: ConsultaResult) => {
    if (result.status === 'error') return <Badge variant="destructive">Erro</Badge>;
    if (result.hasRegistration) return <Badge variant="destructive">Já Cadastrado</Badge>;
    return <Badge variant="default" className="bg-green-600">Disponível</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Consulta CNPJ - Regularize
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Verifique se os CNPJs já possuem cadastro na plataforma Regularize antes de iniciar o processo
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                CNPJ Individual
              </TabsTrigger>
              <TabsTrigger value="multiple" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Lista de CNPJs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="single-cnpj">CNPJ</Label>
                <Input
                  id="single-cnpj"
                  value={singleCNPJ}
                  onChange={(e) => setSingleCNPJ(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
              <Button 
                onClick={handleSingleConsulta}
                disabled={isLoading || !singleCNPJ}
                className="w-full"
              >
                {isLoading ? "Consultando..." : "Consultar CNPJ"}
              </Button>
            </TabsContent>

            <TabsContent value="multiple" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="multiple-cnpjs">Lista de CNPJs</Label>
                <Textarea
                  id="multiple-cnpjs"
                  value={multipleCNPJs}
                  onChange={(e) => setMultipleCNPJs(e.target.value)}
                  placeholder="Cole aqui uma lista de CNPJs (um por linha ou separados por vírgula)"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {extractCNPJs(multipleCNPJs).length} CNPJs detectados
                </p>
              </div>
              <Button 
                onClick={handleMultipleConsulta}
                disabled={isLoading || !multipleCNPJs}
                className="w-full"
              >
                {isLoading ? "Consultando..." : "Consultar CNPJs"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {currentJob && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getJobStatusIcon()}
              Status da Consulta
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {getJobStatusText()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{currentJob.progress}/{currentJob.total}</span>
                </div>
                <Progress 
                  value={(currentJob.progress / currentJob.total) * 100} 
                  className="w-full" 
                />
              </div>
              
              {currentJob.error_message && (
                <div className="p-3 border border-destructive/20 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive">{currentJob.error_message}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Resultados da Consulta</CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Total: {results.length}</span>
              <span className="text-green-600">
                Disponíveis: {results.filter(r => r.status === 'success' && !r.hasRegistration).length}
              </span>
              <span className="text-destructive">
                Já Cadastrados: {results.filter(r => r.status === 'success' && r.hasRegistration).length}
              </span>
              <span className="text-destructive">
                Erros: {results.filter(r => r.status === 'error').length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result)}
                      <span className="font-mono text-lg">{formatCNPJ(result.cnpj)}</span>
                    </div>
                    {getStatusBadge(result)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>{result.message}</p>
                    {result.finalUrl && result.finalUrl !== 'error' && (
                      <p className="mt-1">
                        <strong>URL Final:</strong> {result.finalUrl}
                      </p>
                    )}
                    {result.method && (
                      <p className="mt-1">
                        <strong>Método:</strong> {result.method === 'redirect_analysis' ? 'Análise de Redirecionamento' : 
                                                    result.method === 'js_redirect_analysis' ? 'Redirecionamento JavaScript' :
                                                    result.method === 'content_analysis_login' ? 'Análise de Conteúdo (Login)' :
                                                    result.method === 'content_analysis_registration' ? 'Análise de Conteúdo (Registro)' :
                                                    result.method === 'content_analysis_uncertain' ? 'Análise de Conteúdo (Incerto)' :
                                                    result.method === 'error' ? 'Erro' : result.method}
                      </p>
                    )}
                    {result.evidence && result.evidence !== 'Error: undefined' && (
                      <p className="mt-1">
                        <strong>Evidência:</strong> {result.evidence}
                      </p>
                    )}
                    {result.timestamp && (
                      <p className="mt-1 text-xs">
                        <strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {results.some(r => r.status === 'success' && !r.hasRegistration) && (
              <div className="mt-4 pt-4 border-t">
                <Button onClick={handleContinueWithoutRegistration} className="w-full">
                  Continuar com CNPJs Disponíveis ({results.filter(r => r.status === 'success' && !r.hasRegistration).length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}