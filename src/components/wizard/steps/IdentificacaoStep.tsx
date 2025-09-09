import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle } from "lucide-react";
import { CadastroData } from "../CadastroWizard";

interface IdentificacaoStepProps {
  data: CadastroData;
  updateData: (data: Partial<CadastroData>) => void;
  availableCNPJs: string[];
}

export function IdentificacaoStep({ data, updateData, availableCNPJs = [] }: IdentificacaoStepProps) {
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const handleCNPJSelect = (cnpj: string) => {
    const formatted = formatCNPJ(cnpj);
    updateData({ cnpj: formatted });
  };

  const isValidCNPJ = data.cnpj && data.cnpj.replace(/\D/g, '').length === 14;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold">Selecionar CNPJ</h3>
        <p className="text-muted-foreground">
          Selecione o CNPJ que será cadastrado no Regularize
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {availableCNPJs && availableCNPJs.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="cnpj" className="text-sm font-medium">
              CNPJ Disponível para Cadastro *
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              CNPJs verificados e disponíveis para cadastro na Regularize
            </p>
            <div className="relative">
              <Select onValueChange={handleCNPJSelect} value={data.cnpj.replace(/\D/g, '')}>
                <SelectTrigger className="rounded-2xl border-border/50 focus:border-primary transition-colors">
                  <SelectValue placeholder="Selecione um CNPJ disponível" />
                </SelectTrigger>
                <SelectContent>
                  {availableCNPJs.map((cnpj) => (
                    <SelectItem key={cnpj} value={cnpj}>
                      {formatCNPJ(cnpj)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isValidCNPJ && (
                <CheckCircle className="absolute right-10 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200 text-center">
            <p className="text-sm text-yellow-700">
              Nenhum CNPJ disponível. Por favor, retorne à etapa de consulta.
            </p>
          </div>
        )}

        {isValidCNPJ && (
          <div className="p-4 rounded-2xl bg-success/10 border border-success/20 animate-scale-in">
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="w-4 h-4" />
              CNPJ selecionado e verificado! Continue para o próximo passo.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}