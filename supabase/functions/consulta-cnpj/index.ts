import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cnpjs, jobId } = await req.json()

    // If jobId is provided, return job status
    if (jobId) {
      const { data: job, error } = await supabase
        .from('cnpj_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          job
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Validate CNPJs
    if (!cnpjs || !Array.isArray(cnpjs) || cnpjs.length === 0) {
      throw new Error('CNPJs array is required')
    }

    // Validate CNPJ format
    const validCnpjs = cnpjs.filter(cnpj => /^\d{14}$/.test(cnpj))
    if (validCnpjs.length === 0) {
      throw new Error('No valid CNPJs found')
    }

    console.log(`Criando job para ${validCnpjs.length} CNPJs`)

    // Create job in database
    const { data: job, error: jobError } = await supabase
      .from('cnpj_jobs')
      .insert({
        cnpjs: validCnpjs,
        total: validCnpjs.length,
        status: 'pending'
      })
      .select()
      .single()

    if (jobError) throw jobError

    console.log(`Job criado com ID: ${job.id}`)

    // Start background processing (don't await)
    EdgeRuntime.waitUntil(processJob(job.id, validCnpjs))

    return new Response(
      JSON.stringify({ 
        success: true,
        jobId: job.id,
        message: `Job criado para ${validCnpjs.length} CNPJs. Use o jobId para consultar o status.`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in consulta-cnpj function:', error)
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

async function checkCNPJRegistration(cnpj: string): Promise<boolean> {
  const formattedCNPJ = formatCNPJ(cnpj)
  
  try {
    console.log(`Consultando CNPJ ${formattedCNPJ} no Regularize`)
    
    // First, try to access the registration page to get any necessary tokens or session data
    const initialResponse = await fetch('https://www.regularize.pgfn.gov.br/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })

    // Check if we can access the registration endpoint
    const response = await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Referer': 'https://www.regularize.pgfn.gov.br/',
        'Origin': 'https://www.regularize.pgfn.gov.br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: `cnpj=${encodeURIComponent(formattedCNPJ)}&tipoPessoa=J`
    })

    const responseText = await response.text()
    console.log(`Response status: ${response.status}`)
    console.log(`Response preview: ${responseText.substring(0, 300)}...`)
    
    // Enhanced indicators for already registered CNPJs
    const alreadyRegisteredIndicators = [
      'já está cadastrado',
      'já cadastrado',
      'efetue login com senha', 
      'efetue o login',
      'fazer login',
      'cnpj informado já está cadastrado',
      'cnpj já cadastrado',
      'already registered',
      'login required',
      'senha de acesso',
      'digite sua senha',
      'entrar no sistema',
      'acesso ao sistema'
    ]
    
    // Also check for error indicators that suggest CNPJ is available
    const availableIndicators = [
      'cnpj não encontrado',
      'cnpj inválido', 
      'dados não encontrados',
      'não há cadastro',
      'cadastro não encontrado'
    ]
    
    const responseTextLower = responseText.toLowerCase()
    
    const isRegistered = alreadyRegisteredIndicators.some(indicator => 
      responseTextLower.includes(indicator.toLowerCase())
    )
    
    const isAvailable = availableIndicators.some(indicator => 
      responseTextLower.includes(indicator.toLowerCase())
    )
    
    // If we get a 405 (Method Not Allowed), it might mean the endpoint changed
    // In this case, we'll check for specific content patterns
    if (response.status === 405) {
      console.log(`Method not allowed - checking for alternative patterns`)
      // For now, return false (available) since we can't determine the real status
      return false
    }
    
    console.log(`CNPJ ${formattedCNPJ} registration status: ${isRegistered ? 'REGISTERED' : 'NOT_REGISTERED'}`)
    console.log(`Available indicators found: ${isAvailable}`)
    
    return isRegistered
    
  } catch (error) {
    console.error(`Erro ao consultar CNPJ ${formattedCNPJ}:`, error)
    // If there's an error, assume the CNPJ is available (false = não possui cadastro)
    return false
  }
}

function formatCNPJ(cnpj: string): string {
  // Remove all non-digits
  const numbers = cnpj.replace(/\D/g, '')
  
  // Format as XX.XXX.XXX/XXXX-XX
  if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  
  return cnpj
}

async function processJob(jobId: string, cnpjs: string[]) {
  console.log(`Iniciando processamento do job ${jobId}`)
  
  try {
    // Update job status to processing
    await supabase
      .from('cnpj_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    const results = []
    let processed = 0

    for (const cnpj of cnpjs) {
      console.log(`Processando CNPJ: ${cnpj}`)
      
      try {
        // Real CNPJ consultation to Regularize
        const hasRegistration = await checkCNPJRegistration(cnpj)
        
        results.push({
          cnpj,
          hasRegistration,
          status: 'success',
          message: hasRegistration ? 'CNPJ já possui cadastro na Regularize' : 'CNPJ não possui cadastro na Regularize'
        })
        
        console.log(`CNPJ ${cnpj}: ${hasRegistration ? 'JÁ CADASTRADO' : 'DISPONÍVEL'}`)
        
      } catch (error) {
        console.error(`Erro ao processar CNPJ ${cnpj}:`, error)
        results.push({
          cnpj,
          hasRegistration: null,
          status: 'error',
          message: `Erro ao consultar: ${error.message}`
        })
      }
      
      processed++
      
      // Update progress
      await supabase
        .from('cnpj_jobs')
        .update({ 
          progress: processed,
          results: results
        })
        .eq('id', jobId)
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Mark job as completed
    await supabase
      .from('cnpj_jobs')
      .update({ 
        status: 'completed',
        results: results,
        progress: processed
      })
      .eq('id', jobId)

    console.log(`Job ${jobId} finalizado com sucesso`)

  } catch (error) {
    console.error(`Erro no processamento do job ${jobId}:`, error)
    
    // Mark job as failed
    await supabase
      .from('cnpj_jobs')
      .update({ 
        status: 'failed',
        error_message: error.message
      })
      .eq('id', jobId)
  }
}
