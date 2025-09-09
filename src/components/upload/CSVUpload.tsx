import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CSVData {
  cnpj: string;
  cpf: string;
  nomeMae: string;
  dataNascimento: string;
  email: string;
  celular: string;
  senha: string;
  fraseSeguranca: string;
}

interface CSVUploadProps {
  onDataLoaded: (data: CSVData[]) => void;
}

export function CSVUpload({ onDataLoaded }: CSVUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedData, setUploadedData] = useState<CSVData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCSV = (content: string): CSVData[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const expectedHeaders = [
      'cnpj', 'cpf', 'nomeMae', 'dataNascimento', 
      'email', 'celular', 'senha', 'fraseSeguranca'
    ];
    
    // Validate headers
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}`);
    }

    const data: CSVData[] = [];
    const newErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length !== headers.length) {
        newErrors.push(`Linha ${i + 1}: Número de colunas incorreto`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Basic validation
      if (!row.cnpj || !row.cpf || !row.email) {
        newErrors.push(`Linha ${i + 1}: CNPJ, CPF e E-mail são obrigatórios`);
        continue;
      }

      data.push(row as CSVData);
    }

    setErrors(newErrors);
    return data;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrors(['Apenas arquivos CSV são aceitos']);
      return;
    }

    setIsProcessing(true);
    setErrors([]);

    try {
      const content = await file.text();
      const data = parseCSV(content);
      
      setUploadedData(data);
      onDataLoaded(data);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Erro ao processar arquivo']);
    } finally {
      setIsProcessing(false);
    }
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'cnpj', 'cpf', 'nomeMae', 'dataNascimento', 
      'email', 'celular', 'senha', 'fraseSeguranca'
    ];
    
    const sampleData = [
      '12.345.678/0001-90',
      '123.456.789-00',
      'Maria da Silva',
      '15/03/1980',
      'responsavel@empresa.com',
      '(11) 99999-9999',
      'senha123',
      'Minha frase de segurança exemplo'
    ];

    const csv = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_cadastros.csv';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    setUploadedData([]);
    setErrors([]);
    onDataLoaded([]);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Upload de Cadastros em Lote
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border/50 hover:border-primary/50 hover:bg-card/80'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          
          {isProcessing ? (
            <div className="space-y-2">
              <div className="text-lg font-medium">Processando arquivo...</div>
              <div className="text-sm text-muted-foreground">
                Validando dados do CSV
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  Arraste seu arquivo CSV aqui
                </h3>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar
                </p>
              </div>
              
              <Label htmlFor="file-upload">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  asChild
                >
                  <span>Selecionar Arquivo</span>
                </Button>
              </Label>
            </div>
          )}
        </div>

        {/* Template Download */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/50">
          <div className="space-y-1">
            <div className="font-medium text-sm">Não tem um arquivo CSV?</div>
            <div className="text-xs text-muted-foreground">
              Baixe nosso template com as colunas obrigatórias
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="rounded-2xl"
          >
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-sm text-destructive mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Erros encontrados</span>
            </div>
            <ul className="text-xs space-y-1">
              {errors.slice(0, 5).map((error, index) => (
                <li key={index} className="text-muted-foreground">• {error}</li>
              ))}
              {errors.length > 5 && (
                <li className="text-muted-foreground">
                  • E mais {errors.length - 5} erro(s)...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Success */}
        {uploadedData.length > 0 && errors.length === 0 && (
          <div className="p-4 rounded-2xl bg-success/10 border border-success/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">
                  {uploadedData.length} cadastro(s) carregado(s) com sucesso
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-success/10 text-success border-success/20">
                  {uploadedData.length} itens
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearData}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Data Preview */}
        {uploadedData.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Preview dos dados:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedData.slice(0, 3).map((item, index) => (
                <div key={index} className="p-3 rounded-xl border border-border/30 text-xs space-y-1">
                  <div className="font-medium">{item.cnpj} - {item.email}</div>
                  <div className="text-muted-foreground">
                    CPF: {item.cpf} | Nasc: {item.dataNascimento}
                  </div>
                </div>
              ))}
              {uploadedData.length > 3 && (
                <div className="text-center text-xs text-muted-foreground py-2">
                  ... e mais {uploadedData.length - 3} registro(s)
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}