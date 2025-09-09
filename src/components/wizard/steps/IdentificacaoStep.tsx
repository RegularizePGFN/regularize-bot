import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import { CadastroData } from "../CadastroWizard";

interface IdentificacaoStepProps {
  data: CadastroData;
  updateData: (data: Partial<CadastroData>) => void;
}

export function IdentificacaoStep({ data, updateData }: IdentificacaoStepProps) {
  const formatCNPJ = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    return value;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    updateData({ cnpj: formatted });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold">Identificação da Empresa</h3>
        <p className="text-muted-foreground">
          Informe o CNPJ da empresa que será cadastrada no Regularize
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="cnpj" className="text-sm font-medium">
            CNPJ da Empresa *
          </Label>
          <Input
            id="cnpj"
            type="text"
            placeholder="00.000.000/0000-00"
            value={data.cnpj}
            onChange={handleCNPJChange}
            maxLength={18}
            className="rounded-2xl border-border/50 focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground">
            Digite apenas os números ou use a formatação padrão
          </p>
        </div>

        {data.cnpj.length >= 14 && (
          <div className="p-4 rounded-2xl bg-success/10 border border-success/20 animate-scale-in">
            <div className="flex items-center gap-2 text-sm text-success">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              CNPJ válido! Continue para o próximo passo.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}