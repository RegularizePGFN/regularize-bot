import { Job } from "@/components/jobs/JobsList";

export const mockMetrics = {
  cadastrosHoje: 47,
  taxaSucesso: 96.3,
  tempoMedio: 1.8,
  custoPorCadastro: 0.33,
};

export const mockJobs: Job[] = [
  {
    id: "job-001",
    cnpj: "12.345.678/0001-90",
    responsavelNome: "João Silva",
    email: "joao@empresa.com",
    status: "completed",
    progresso: 100,
    tempoInicio: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    tempoFim: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    comprovante: "comprovante-001.pdf",
  },
  {
    id: "job-002",
    cnpj: "98.765.432/0001-10",
    responsavelNome: "Maria Santos",
    email: "maria@comercial.com",
    status: "processing",
    etapaAtual: "Resolvendo hCaptcha",
    progresso: 65,
    tempoInicio: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    tempoEstimado: 1.5,
  },
  {
    id: "job-003",
    cnpj: "11.222.333/0001-44",
    responsavelNome: "Carlos Oliveira",
    email: "carlos@consultoria.com.br",
    status: "failed",
    progresso: 45,
    tempoInicio: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    tempoFim: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
    error: "Falha na validação do código OTP. E-mail pode estar incorreto.",
  },
  {
    id: "job-004",
    cnpj: "55.666.777/0001-88",
    responsavelNome: "Ana Costa",
    email: "ana@fiscal.com",
    status: "pending",
    progresso: 0,
    tempoInicio: new Date(Date.now() - 30 * 1000), // 30 seconds ago
  },
  {
    id: "job-005",
    cnpj: "33.444.555/0001-22",
    responsavelNome: "Pedro Lima",
    email: "pedro@contabilidade.net",
    status: "completed",
    progresso: 100,
    tempoInicio: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    tempoFim: new Date(Date.now() - 13 * 60 * 1000), // 13 minutes ago
    comprovante: "comprovante-005.pdf",
  }
];