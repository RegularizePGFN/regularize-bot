import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Eye, EyeOff } from "lucide-react";
import { CadastroData } from "../CadastroWizard";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SegurancaStepProps {
  data: CadastroData;
  updateData: (data: Partial<CadastroData>) => void;
}

export function SegurancaStep({ data, updateData }: SegurancaStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch = data.senha && data.confirmarSenha && data.senha === data.confirmarSenha;
  const passwordStrong = data.senha.length >= 8;
  const fraseValid = data.fraseSeguranca.length >= 10 && data.fraseSeguranca.length <= 140;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold">Configuração de Segurança</h3>
        <p className="text-muted-foreground">
          Defina as credenciais de acesso e segurança da conta
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Senha */}
        <div className="space-y-2">
          <Label htmlFor="senha" className="text-sm font-medium">
            Senha *
          </Label>
          <div className="relative">
            <Input
              id="senha"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              value={data.senha}
              onChange={(e) => updateData({ senha: e.target.value })}
              className="rounded-2xl border-border/50 focus:border-primary transition-colors pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {data.senha && (
            <div className={`text-xs flex items-center gap-2 ${passwordStrong ? 'text-success' : 'text-destructive'}`}>
              <div className={`w-2 h-2 rounded-full ${passwordStrong ? 'bg-success' : 'bg-destructive'}`}></div>
              {passwordStrong ? 'Senha forte' : 'Senha deve ter pelo menos 8 caracteres'}
            </div>
          )}
        </div>

        {/* Confirmar Senha */}
        <div className="space-y-2">
          <Label htmlFor="confirmarSenha" className="text-sm font-medium">
            Confirmar Senha *
          </Label>
          <div className="relative">
            <Input
              id="confirmarSenha"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repita a senha"
              value={data.confirmarSenha}
              onChange={(e) => updateData({ confirmarSenha: e.target.value })}
              className="rounded-2xl border-border/50 focus:border-primary transition-colors pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {data.confirmarSenha && (
            <div className={`text-xs flex items-center gap-2 ${passwordsMatch ? 'text-success' : 'text-destructive'}`}>
              <div className={`w-2 h-2 rounded-full ${passwordsMatch ? 'bg-success' : 'bg-destructive'}`}></div>
              {passwordsMatch ? 'Senhas coincidem' : 'Senhas não coincidem'}
            </div>
          )}
        </div>

        {/* Frase de Segurança */}
        <div className="space-y-2">
          <Label htmlFor="fraseSeguranca" className="text-sm font-medium">
            Frase de Segurança *
          </Label>
          <Textarea
            id="fraseSeguranca"
            placeholder="Digite uma frase que você lembrará facilmente (10 a 140 caracteres)"
            value={data.fraseSeguranca}
            onChange={(e) => updateData({ fraseSeguranca: e.target.value })}
            maxLength={140}
            rows={3}
            className="rounded-2xl border-border/50 focus:border-primary transition-colors resize-none"
          />
          <div className="flex justify-between text-xs">
            <span className={fraseValid ? 'text-success' : 'text-muted-foreground'}>
              {data.fraseSeguranca.length}/140 caracteres
            </span>
            <span className={`${fraseValid ? 'text-success' : 'text-destructive'}`}>
              {data.fraseSeguranca.length < 10 ? 'Mínimo 10 caracteres' : 
               data.fraseSeguranca.length > 140 ? 'Máximo 140 caracteres' : 
               'Válida'}
            </span>
          </div>
        </div>

        {/* Validação Geral */}
        {passwordStrong && passwordsMatch && fraseValid && (
          <div className="p-4 rounded-2xl bg-success/10 border border-success/20 animate-scale-in">
            <div className="flex items-center gap-2 text-sm text-success">
              <Shield className="h-4 w-4" />
              Configurações de segurança válidas!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}