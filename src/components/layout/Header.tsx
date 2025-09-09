import { Shield, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Cadastro Regularize
              </h1>
              <p className="text-xs text-muted-foreground">
                Automação PGFN
              </p>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-2xl">
            <HelpCircle className="h-4 w-4 mr-2" />
            Ajuda
          </Button>
          <Button variant="ghost" size="sm" className="rounded-2xl">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </nav>
      </div>
    </header>
  );
}