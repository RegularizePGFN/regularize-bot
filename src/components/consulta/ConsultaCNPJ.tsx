import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertCircle, Search, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ConsultaResult {
  cnpj: string;
  hasRegistration: boolean | null;
  status: 'success' | 'error';
  message: string;
}

interface ConsultaCNPJProps {
  onContinue: (cnpjsWithoutRegistration: string[]) => void;
}

export function ConsultaCNPJ({ onContinue }: ConsultaCNPJProps) {
  const [singleCNPJ, setSingleCNPJ] = useState("");
  const [multipleCNPJs, setMultipleCNPJs] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

    try {
      const response = await supabase.functions.invoke('consulta-cnpj', {
        body: { cnpjs }
      });

      if (response.error) throw response.error;

      const { results: consultaResults } = response.data;
      setResults(consultaResults);

      const successCount = consultaResults.filter((r: ConsultaResult) => r.status === 'success').length;
      const errorCount = consultaResults.filter((r: ConsultaResult) => r.status === 'error').length;

      toast({
        title: "Consulta Finalizada",
        description: `${successCount} CNPJs consultados com sucesso. ${errorCount} erros.`,
      });

    } catch (error) {
      console.error('Error consulting CNPJs:', error);
      toast({
        title: "Erro",
        description: "Erro ao consultar CNPJs. Tente novamente.",
        variant: "destructive",
      });
    } finally {
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
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result)}
                    <span className="font-mono">{formatCNPJ(result.cnpj)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{result.message}</span>
                    {getStatusBadge(result)}
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