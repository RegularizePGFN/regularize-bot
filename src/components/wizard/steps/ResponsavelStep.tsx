import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Calendar, Mail, Phone } from "lucide-react";
import { CadastroData } from "../CadastroWizard";
import { useState } from "react";

interface ResponsavelStepProps {
  data: CadastroData;
  updateData: (data: Partial<CadastroData>) => void;
}

export function ResponsavelStep({ data, updateData }: ResponsavelStepProps) {
  const [nomeMaeEmpty, setNomeMaeEmpty] = useState(false);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatDate = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 8) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})(\d)/, '$1/$2');
    }
    return value;
  };

  const handleNomeMaeEmpty = () => {
    setNomeMaeEmpty(true);
    updateData({ nomeMae: "EM BRANCO" });
  };

  const handleNomeMaeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNomeMaeEmpty(false);
    updateData({ nomeMae: e.target.value });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold">Dados do Responsável</h3>
        <p className="text-muted-foreground">
          Informações da pessoa responsável pelo cadastro
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* CPF */}
        <div className="space-y-2">
          <Label htmlFor="cpf" className="text-sm font-medium">
            CPF do Responsável *
          </Label>
          <Input
            id="cpf"
            type="text"
            placeholder="000.000.000-00"
            value={data.cpf}
            onChange={(e) => updateData({ cpf: formatCPF(e.target.value) })}
            maxLength={14}
            className="rounded-2xl border-border/50 focus:border-primary transition-colors"
          />
        </div>

        {/* Nome da Mãe */}
        <div className="space-y-2">
          <Label htmlFor="nomeMae" className="text-sm font-medium">
            Nome da Mãe
          </Label>
          <div className="space-y-2">
            <Input
              id="nomeMae"
              type="text"
              placeholder="Nome completo da mãe"
              value={nomeMaeEmpty ? "" : data.nomeMae}
              onChange={handleNomeMaeChange}
              disabled={nomeMaeEmpty}
              className="rounded-2xl border-border/50 focus:border-primary transition-colors"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNomeMaeEmpty}
              className="text-xs rounded-2xl"
              disabled={nomeMaeEmpty}
            >
              Deixar em branco
            </Button>
            {nomeMaeEmpty && (
              <p className="text-xs text-muted-foreground">
                Campo preenchido como "EM BRANCO"
              </p>
            )}
          </div>
        </div>

        {/* Data de Nascimento */}
        <div className="space-y-2">
          <Label htmlFor="dataNascimento" className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data de Nascimento *
          </Label>
          <Input
            id="dataNascimento"
            type="text"
            placeholder="DD/MM/AAAA"
            value={data.dataNascimento}
            onChange={(e) => updateData({ dataNascimento: formatDate(e.target.value) })}
            maxLength={10}
            className="rounded-2xl border-border/50 focus:border-primary transition-colors"
          />
        </div>

        {/* E-mail */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            E-mail *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="email@exemplo.com"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
            className="rounded-2xl border-border/50 focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground">
            Será usado para receber o código de verificação OTP
          </p>
        </div>

        {/* Celular */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="celular" className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Celular *
          </Label>
          <Input
            id="celular"
            type="text"
            placeholder="(00) 00000-0000"
            value={data.celular}
            onChange={(e) => updateData({ celular: formatPhone(e.target.value) })}
            maxLength={15}
            className="rounded-2xl border-border/50 focus:border-primary transition-colors"
          />
        </div>
      </div>
    </div>
  );
}