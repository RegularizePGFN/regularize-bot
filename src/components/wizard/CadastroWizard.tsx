import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, FileCheck } from "lucide-react";
import { IdentificacaoStep } from "./steps/IdentificacaoStep";
import { ResponsavelStep } from "./steps/ResponsavelStep";
import { SegurancaStep } from "./steps/SegurancaStep";
import { FinalizarStep } from "./steps/FinalizarStep";

export interface CadastroData {
  // Etapa 1 - Identificação
  cnpj: string;
  
  // Etapa 2 - Responsável
  cpf: string;
  nomeMae: string;
  dataNascimento: string;
  email: string;
  celular: string;
  
  // Etapa 3 - Segurança
  senha: string;
  confirmarSenha: string;
  fraseSeguranca: string;
  
  // Etapa 4 - Finalizar
  aceitaTermos: boolean;
}

const initialData: CadastroData = {
  cnpj: "",
  cpf: "",
  nomeMae: "",
  dataNascimento: "",
  email: "",
  celular: "",
  senha: "",
  confirmarSenha: "",
  fraseSeguranca: "",
  aceitaTermos: false,
};

const steps = [
  { id: 1, title: "Identificação", description: "CNPJ da empresa" },
  { id: 2, title: "Responsável", description: "Dados do responsável" },
  { id: 3, title: "Segurança", description: "Senha e segurança" },
  { id: 4, title: "Finalizar", description: "Revisar e confirmar" },
];

interface CadastroWizardProps {
  onSubmit: (data: CadastroData) => void;
  isSubmitting?: boolean;
}

export function CadastroWizard({ onSubmit, isSubmitting = false }: CadastroWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<CadastroData>(initialData);

  const updateData = (stepData: Partial<CadastroData>) => {
    setData(prev => ({ ...prev, ...stepData }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(data);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <IdentificacaoStep data={data} updateData={updateData} />;
      case 2:
        return <ResponsavelStep data={data} updateData={updateData} />;
      case 3:
        return <SegurancaStep data={data} updateData={updateData} />;
      case 4:
        return <FinalizarStep data={data} updateData={updateData} onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.cnpj.length >= 14;
      case 2:
        return data.cpf && data.email && data.celular && data.dataNascimento;
      case 3:
        return data.senha && data.confirmarSenha && data.fraseSeguranca && 
               data.senha === data.confirmarSenha && 
               data.fraseSeguranca.length >= 10 && data.fraseSeguranca.length <= 140;
      case 4:
        return data.aceitaTermos;
      default:
        return false;
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card/50 border-border/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileCheck className="h-6 w-6 text-primary" />
          Novo Cadastro Regularize
        </CardTitle>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-sm text-muted-foreground">
            {steps.map((step) => (
              <div key={step.id} className={`text-center ${
                step.id === currentStep ? 'text-primary font-medium' : 
                step.id < currentStep ? 'text-success' : ''
              }`}>
                <div className="font-medium">{step.title}</div>
                <div className="text-xs">{step.description}</div>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="min-h-[300px]">
          {renderStep()}
        </div>

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="rounded-2xl"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}