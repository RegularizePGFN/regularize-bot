import { useEffect, useState } from "react";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { CadastroWizard } from "@/components/wizard/CadastroWizard";
import { JobsList } from "@/components/jobs/JobsList";
import { CSVUpload } from "@/components/upload/CSVUpload";
import { Metrics } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    cadastrosHoje: 0,
    taxaSucesso: 0,
    tempoMedio: 0
  });
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      // Calculate metrics from database
      await supabase.rpc('calculate_daily_metrics');
      
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setMetrics({
          cadastrosHoje: data.cadastros_hoje,
          taxaSucesso: data.taxa_sucesso,
          tempoMedio: data.tempo_medio
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleCadastroSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      const response = await supabase.functions.invoke('process-cadastro', {
        body: { cadastroData: data }
      });

      if (response.error) throw response.error;
      
      toast({
        title: "Cadastro Iniciado",
        description: `Cadastro iniciado com sucesso. ID: ${response.data.jobId}`,
      });
      
      // Refresh metrics after new job
      await fetchMetrics();
      
    } catch (error) {
      console.error('Error submitting cadastro:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o cadastro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCSVUpload = async (data: any[]) => {
    try {
      for (const cadastroData of data) {
        await supabase.functions.invoke('process-cadastro', {
          body: { cadastroData }
        });
      }
      
      toast({
        title: "CSV Processado",
        description: `${data.length} cadastros foram processados com sucesso.`,
      });
      
      await fetchMetrics();
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar CSV. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Cadastro Regularize
          </h1>
          <p className="text-muted-foreground text-lg">
            Sistema automatizado para cadastro na plataforma Regularize/PGFN
          </p>
        </div>

        {/* Metrics */}
        <DashboardMetrics metrics={metrics} />

        {/* Main Content */}
        <Tabs defaultValue="novo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="novo" className="rounded-xl">
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Cadastro
            </TabsTrigger>
            <TabsTrigger value="upload" className="rounded-xl">
              <FileUp className="h-4 w-4 mr-2" />
              Upload CSV
            </TabsTrigger>
            <TabsTrigger value="historico" className="rounded-xl">
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="space-y-6">
            <CadastroWizard 
              onSubmit={handleCadastroSubmit}
              isSubmitting={isSubmitting}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Upload de Lote (CSV)</CardTitle>
              </CardHeader>
              <CardContent>
                <CSVUpload onDataLoaded={handleCSVUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <JobsList onJobUpdate={fetchMetrics} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}