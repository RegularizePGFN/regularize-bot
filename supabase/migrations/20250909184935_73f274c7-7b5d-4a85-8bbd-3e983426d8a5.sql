-- Criar tabela para jobs de consulta CNPJ
CREATE TABLE public.cnpj_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpjs TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  results JSONB,
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cnpj_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now since no auth implemented)
CREATE POLICY "Allow all operations on cnpj_jobs" 
ON public.cnpj_jobs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cnpj_jobs_updated_at
BEFORE UPDATE ON public.cnpj_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();