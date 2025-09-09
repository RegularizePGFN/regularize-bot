import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Building2, User, Shield, Loader2 } from "lucide-react";
import { CadastroData } from "../CadastroWizard";

interface FinalizarStepProps {
  data: CadastroData;
  updateData: (data: Partial<CadastroData>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function FinalizarStep({ data, updateData, onSubmit, isSubmitting }: FinalizarStepProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-2xl font-semibold">Revisar e Finalizar</h3>
        <p className="text-muted-foreground">
          Confirme todas as informações antes de iniciar o cadastro
        </p>
      </div>

      {/* Resumo dos Dados */}
      <div className="space-y-4">
        {/* Identificação */}
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Identificação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">CNPJ:</span> {data.cnpj}</div>
            </div>
          </CardContent>
        </Card>

        {/* Responsável */}
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">CPF:</span> {data.cpf}</div>
              <div><span className="text-muted-foreground">Nome da Mãe:</span> {data.nomeMae || "EM BRANCO"}</div>
              <div><span className="text-muted-foreground">Data Nascimento:</span> {data.dataNascimento}</div>
              <div><span className="text-muted-foreground">E-mail:</span> {data.email}</div>
              <div><span className="text-muted-foreground">Celular:</span> {data.celular}</div>
            </div>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">Senha:</span> •••••••• (configurada)</div>
              <div><span className="text-muted-foreground">Frase de Segurança:</span> {data.fraseSeguranca.substring(0, 30)}{data.fraseSeguranca.length > 30 ? '...' : ''}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Termos e Condições */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 rounded-2xl border border-border/50 bg-card/30">
          <Checkbox
            id="termos"
            checked={data.aceitaTermos}
            onCheckedChange={(checked) => updateData({ aceitaTermos: !!checked })}
            className="mt-0.5"
          />
          <Label htmlFor="termos" className="text-sm leading-relaxed cursor-pointer">
            Eu li e aceito os <span className="text-primary hover:underline">termos de uso</span> e 
            a <span className="text-primary hover:underline">política de privacidade</span>. 
            Autorizo o processamento dos dados fornecidos para realização do cadastro no Regularize/PGFN.
          </Label>
        </div>

        <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
          <h4 className="text-sm font-medium mb-2">Próximos passos:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• O sistema acessará automaticamente o site do Regularize</li>
            <li>• O hCaptcha será resolvido automaticamente via SolveCaptcha API</li>
            <li>• Um código OTP será enviado para o e-mail informado</li>
            <li>• O sistema capturará e inserirá o código automaticamente</li>
            <li>• Todas as etapas serão documentadas com screenshots</li>
          </ul>
        </div>

        {/* Botão Finalizar */}
        <Button
          onClick={onSubmit}
          disabled={!data.aceitaTermos || isSubmitting}
          size="lg"
          className="w-full rounded-2xl bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white font-medium h-12"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Iniciando Cadastro...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Finalizar Cadastro
            </>
          )}
        </Button>
      </div>
    </div>
  );
}