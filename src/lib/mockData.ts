// Real data interfaces
export interface Cadastro {
  id: string;
  cnpj: string;
  cpf: string;
  nome_mae: string | null;
  data_nascimento: string;
  email: string;
  celular: string;
  senha_hash: string;
  frase_seguranca_hash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  etapa_atual: string | null;
  progresso: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  tempo_estimado: number | null;
  error_message: string | null;
  comprovante_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Metrics {
  cadastrosHoje: number;
  taxaSucesso: number;
  tempoMedio: number;
}