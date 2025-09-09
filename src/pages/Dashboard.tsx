import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { CadastroWizard, CadastroData } from "@/components/wizard/CadastroWizard";
import { JobsList } from "@/components/jobs/JobsList";
import { CSVUpload } from "@/components/upload/CSVUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockMetrics, mockJobs } from "@/lib/mockData";
import { Plus, FileSpreadsheet, List, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("novo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState(mockJobs);

  const handleSubmitCadastro = async (data: CadastroData) => {
    setIsSubmitting(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newJob = {
        id: `job-${Date.now()}`,
        cnpj: data.cnpj,
        responsavelNome: data.cpf, // Using CPF as name placeholder
        email: data.email,
        status: "pending" as const,
        progresso: 0,
        tempoInicio: new Date(),
      };
      
      setJobs(prev => [newJob, ...prev]);
      setActiveTab("jobs");
      
      toast({
        title: "Cadastro Iniciado!",
        description: `Job criado para ${data.cnpj}. Acompanhe o progresso na aba Jobs.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar o job. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCSVData = async (csvData: any[]) => {
    if (csvData.length === 0) return;

    toast({
      title: "Dados CSV Carregados",
      description: `${csvData.length} cadastro(s) prontos para processamento.`,
    });

    // Here you would typically process the CSV data
    // For now, we'll just show a message
  };

  const handleViewDetails = (jobId: string) => {
    toast({
      title: "Detalhes do Job",
      description: `Abrindo detalhes para o job ${jobId}`,
    });
  };

  const handleDownloadComprovante = (jobId: string) => {
    toast({
      title: "Download Iniciado",
      description: `Baixando comprovante do job ${jobId}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Metrics Dashboard */}
        <DashboardMetrics metrics={mockMetrics} />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-4 rounded-2xl">
              <TabsTrigger value="novo" className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cadastro
              </TabsTrigger>
              <TabsTrigger value="lote" className="rounded-xl">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Upload Lote
              </TabsTrigger>
              <TabsTrigger value="jobs" className="rounded-xl">
                <List className="h-4 w-4 mr-2" />
                Jobs
              </TabsTrigger>
              <TabsTrigger value="config" className="rounded-xl">
                <Settings className="h-4 w-4 mr-2" />
                Config
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="novo" className="space-y-6">
            <CadastroWizard 
              onSubmit={handleSubmitCadastro}
              isSubmitting={isSubmitting}
            />
          </TabsContent>

          <TabsContent value="lote" className="space-y-6">
            <CSVUpload onDataLoaded={handleCSVData} />
            
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium mb-2">Processamento em Lote</h3>
                <p className="text-muted-foreground mb-4">
                  Carregue um arquivo CSV para processar múltiplos cadastros automaticamente.
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="font-medium text-primary">Até 100</div>
                    <div className="text-muted-foreground">cadastros por vez</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-success">4 Workers</div>
                    <div className="text-muted-foreground">processamento paralelo</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-warning">2-3 min</div>
                    <div className="text-muted-foreground">por cadastro</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <JobsList
              jobs={jobs}
              onViewDetails={handleViewDetails}
              onDownloadComprovante={handleDownloadComprovante}
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Configurações</h3>
                <p className="text-muted-foreground">
                  Configure integrações, workers e outras configurações avançadas.
                </p>
                <Button className="mt-4 rounded-2xl" disabled>
                  Em Desenvolvimento
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}