import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { cadastroData } = await req.json()

    // Hash the sensitive data (senha and frase_seguranca)
    const encoder = new TextEncoder()
    const senhaData = encoder.encode(cadastroData.senha)
    const fraseData = encoder.encode(cadastroData.fraseSeguranca)
    
    const senhaHash = await crypto.subtle.digest('SHA-256', senhaData)
    const fraseHash = await crypto.subtle.digest('SHA-256', fraseData)
    
    const senhaHashArray = Array.from(new Uint8Array(senhaHash))
    const fraseHashArray = Array.from(new Uint8Array(fraseHash))
    
    const senhaHashHex = senhaHashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const fraseHashHex = fraseHashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Insert into database
    const { data, error } = await supabaseClient
      .from('cadastros')
      .insert({
        cnpj: cadastroData.cnpj,
        cpf: cadastroData.cpf,
        nome_mae: cadastroData.nomeMae || null,
        data_nascimento: cadastroData.dataNascimento,
        email: cadastroData.email,
        celular: cadastroData.celular,
        senha_hash: senhaHashHex,
        frase_seguranca_hash: fraseHashHex,
        status: 'pending',
        progresso: 0
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Start background processing
    EdgeRuntime.waitUntil(processRegularizeCadastro(data.id, cadastroData, supabaseClient))

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: data.id,
        message: 'Cadastro iniciado com sucesso' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function processRegularizeCadastro(jobId: string, cadastroData: any, supabaseClient: any) {
  try {
    // Update status to processing
    await supabaseClient
      .from('cadastros')
      .update({ 
        status: 'processing', 
        etapa_atual: 'Iniciando processo',
        progresso: 10 
      })
      .eq('id', jobId)

    // TODO: Implement Playwright automation here
    // This is where the actual automation would happen:
    // 1. Navigate to Regularize website
    // 2. Fill form with cadastroData
    // 3. Solve hCaptcha using SolveCaptcha API
    // 4. Handle OTP via email integration
    // 5. Take screenshots for evidence
    // 6. Download comprovante

    // For now, simulate the process
    await simulateProcessing(jobId, supabaseClient)

  } catch (error) {
    console.error('Error processing cadastro:', error)
    await supabaseClient
      .from('cadastros')
      .update({ 
        status: 'failed', 
        error_message: error.message,
        tempo_fim: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}

async function simulateProcessing(jobId: string, supabaseClient: any) {
  const steps = [
    { etapa: 'Acessando site Regularize', progresso: 20 },
    { etapa: 'Preenchendo formulário', progresso: 40 },
    { etapa: 'Resolvendo hCaptcha', progresso: 60 },
    { etapa: 'Aguardando código OTP', progresso: 80 },
    { etapa: 'Finalizando cadastro', progresso: 100 }
  ]

  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
    
    await supabaseClient
      .from('cadastros')
      .update({ 
        etapa_atual: step.etapa,
        progresso: step.progresso
      })
      .eq('id', jobId)
  }

  // Mark as completed
  await supabaseClient
    .from('cadastros')
    .update({ 
      status: 'completed',
      tempo_fim: new Date().toISOString(),
      comprovante_url: `https://example.com/comprovante-${jobId}.pdf`
    })
    .eq('id', jobId)

  // Update daily metrics
  await supabaseClient.rpc('calculate_daily_metrics')
}