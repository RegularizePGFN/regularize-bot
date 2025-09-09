-- Create cadastros table for real registration data
CREATE TABLE public.cadastros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL,
  cpf TEXT NOT NULL,
  nome_mae TEXT,
  data_nascimento DATE NOT NULL,
  email TEXT NOT NULL,
  celular TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  frase_seguranca_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  etapa_atual TEXT,
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  tempo_inicio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tempo_fim TIMESTAMP WITH TIME ZONE,
  tempo_estimado DECIMAL,
  error_message TEXT,
  comprovante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metrics table to store daily metrics
CREATE TABLE public.metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  cadastros_hoje INTEGER DEFAULT 0,
  taxa_sucesso DECIMAL DEFAULT 0,
  tempo_medio DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Enable Row Level Security
ALTER TABLE public.cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for full access (since it's for personal use)
CREATE POLICY "Allow all operations on cadastros" 
ON public.cadastros 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on metrics" 
ON public.metrics 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_cadastros_updated_at
  BEFORE UPDATE ON public.cadastros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate daily metrics
CREATE OR REPLACE FUNCTION public.calculate_daily_metrics()
RETURNS void AS $$
DECLARE
  hoje DATE := CURRENT_DATE;
  total_cadastros INTEGER;
  cadastros_sucesso INTEGER;
  tempo_medio_calc DECIMAL;
BEGIN
  -- Count total registrations today
  SELECT COUNT(*) INTO total_cadastros
  FROM public.cadastros
  WHERE DATE(created_at) = hoje;
  
  -- Count successful registrations today
  SELECT COUNT(*) INTO cadastros_sucesso
  FROM public.cadastros
  WHERE DATE(created_at) = hoje AND status = 'completed';
  
  -- Calculate average time for completed registrations today
  SELECT AVG(EXTRACT(EPOCH FROM (tempo_fim - tempo_inicio))/60) INTO tempo_medio_calc
  FROM public.cadastros
  WHERE DATE(created_at) = hoje 
    AND status = 'completed' 
    AND tempo_fim IS NOT NULL;
  
  -- Insert or update today's metrics
  INSERT INTO public.metrics (date, cadastros_hoje, taxa_sucesso, tempo_medio)
  VALUES (
    hoje,
    total_cadastros,
    CASE WHEN total_cadastros > 0 THEN (cadastros_sucesso::DECIMAL / total_cadastros * 100) ELSE 0 END,
    COALESCE(tempo_medio_calc, 0)
  )
  ON CONFLICT (date) DO UPDATE SET
    cadastros_hoje = EXCLUDED.cadastros_hoje,
    taxa_sucesso = EXCLUDED.taxa_sucesso,
    tempo_medio = EXCLUDED.tempo_medio,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SET search_path = public;