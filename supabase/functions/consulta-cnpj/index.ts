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

interface CNPJCheckResult {
  cnpj: string
  hasRegistration: boolean
  finalUrl: string
  method: string
  evidence: string
  timestamp: string
}

async function checkCNPJRegistration(cnpj: string): Promise<CNPJCheckResult> {
  const formattedCNPJ = formatCNPJ(cnpj)
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`Consultando CNPJ ${formattedCNPJ} no Regularize`)
    
    // Step 1: Follow the exact flow described - start at the base URL
    let currentUrl = 'https://www.regularize.pgfn.gov.br/cadastro'
    let finalUrl = currentUrl
    let method = 'url_analysis'
    let evidence = ''
    
    // Make the POST request to submit CNPJ
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
      body: `cnpj=${encodeURIComponent(formattedCNPJ)}&tipoPessoa=J`,
      redirect: 'manual' // Don't follow redirects automatically
    })

    console.log(`Response status: ${response.status}`)
    
    // Check for redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        finalUrl = location.startsWith('http') ? location : `https://www.regularize.pgfn.gov.br${location}`
        console.log(`Redirect detected to: ${finalUrl}`)
        method = 'redirect_analysis'
        evidence = `HTTP ${response.status} redirect to ${finalUrl}`
      }
    } else {
      // No redirect, analyze the response content and URL
      const responseText = await response.text()
      finalUrl = response.url || currentUrl
      
      console.log(`Final URL: ${finalUrl}`)
      console.log(`Response preview: ${responseText.substring(0, 500)}...`)
      
      // Look for JavaScript redirects in the content
      const jsRedirectMatch = responseText.match(/location\.href\s*=\s*["']([^"']+)["']/i) ||
                             responseText.match(/window\.location\s*=\s*["']([^"']+)["']/i) ||
                             responseText.match(/document\.location\s*=\s*["']([^"']+)["']/i)
      
      if (jsRedirectMatch) {
        const jsRedirectUrl = jsRedirectMatch[1]
        finalUrl = jsRedirectUrl.startsWith('http') ? jsRedirectUrl : `https://www.regularize.pgfn.gov.br${jsRedirectUrl}`
        console.log(`JavaScript redirect detected to: ${finalUrl}`)
        method = 'js_redirect_analysis'
        evidence = `JavaScript redirect to ${finalUrl}`
      }
      
      // Content analysis as fallback
      if (!jsRedirectMatch) {
        method = 'content_analysis'
        evidence = `Content analysis of ${responseText.length} chars`
      }
    }
    
    // Determine registration status based on final URL
    let hasRegistration = false
    
    // Rule: If redirects back to base URL (https://www.regularize.pgfn.gov.br), CNPJ is already registered
    if (finalUrl === 'https://www.regularize.pgfn.gov.br' || 
        finalUrl === 'https://www.regularize.pgfn.gov.br/' ||
        finalUrl.includes('/login') ||
        finalUrl.includes('/dashboard') ||
        finalUrl.includes('/home')) {
      hasRegistration = true
      console.log(`CNPJ ${formattedCNPJ}: JÁ CADASTRADO (redirected to base URL)`)
    }
    // Rule: If goes to /cadastro/cnpj, CNPJ is available for registration
    else if (finalUrl.includes('/cadastro/cnpj') || 
             finalUrl.includes('/cadastro') && finalUrl !== 'https://www.regularize.pgfn.gov.br/cadastro') {
      hasRegistration = false
      console.log(`CNPJ ${formattedCNPJ}: DISPONÍVEL (redirected to registration form)`)
    }
    // Fallback: content analysis
    else {
      // Get the final page content for analysis
      let contentToAnalyze = ''
      try {
        if (response.status < 300 || response.status >= 400) {
          contentToAnalyze = await response.text()
        } else {
          // Fetch the redirected page
          const finalResponse = await fetch(finalUrl)
          contentToAnalyze = await finalResponse.text()
        }
      } catch {
        contentToAnalyze = await response.text()
      }
      
      const contentLower = contentToAnalyze.toLowerCase()
      
      // Look for registration form fields (indicates CNPJ is available)
      const registrationFormIndicators = [
        'cpf do responsável',
        'nome da mãe',
        'data de nascimento',
        'confirmar senha',
        'frase de segurança',
        'input[name="cpf"]',
        'input[name="dataNascimento"]',
        'input[name="email"]'
      ]
      
      // Look for login/already registered indicators
      const alreadyRegisteredIndicators = [
        'já está cadastrado',
        'efetue login',
        'digite sua senha',
        'esqueceu a senha',
        'entrar no sistema',
        'login com gov.br'
      ]
      
      const hasRegistrationForm = registrationFormIndicators.some(indicator => 
        contentLower.includes(indicator.toLowerCase())
      )
      
      const hasLoginForm = alreadyRegisteredIndicators.some(indicator => 
        contentLower.includes(indicator.toLowerCase())
      )
      
      if (hasLoginForm && !hasRegistrationForm) {
        hasRegistration = true
        method = 'content_analysis_login'
        evidence = `Login form detected in content`
      } else if (hasRegistrationForm && !hasLoginForm) {
        hasRegistration = false
        method = 'content_analysis_registration'
        evidence = `Registration form detected in content`
      } else {
        // Default to available if uncertain
        hasRegistration = false
        method = 'content_analysis_uncertain'
        evidence = `Uncertain result, defaulting to available`
      }
      
      console.log(`CNPJ ${formattedCNPJ}: ${hasRegistration ? 'JÁ CADASTRADO' : 'DISPONÍVEL'} (content analysis)`)
    }
    
    return {
      cnpj: formattedCNPJ,
      hasRegistration,
      finalUrl,
      method,
      evidence,
      timestamp
    }
    
  } catch (error) {
    console.error(`Erro ao consultar CNPJ ${formattedCNPJ}:`, error)
    return {
      cnpj: formattedCNPJ,
      hasRegistration: false, // Default to available on error
      finalUrl: 'error',
      method: 'error',
      evidence: `Error: ${error.message}`,
      timestamp
    }
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
        // Real CNPJ consultation to Regularize with detailed result
        const checkResult = await checkCNPJRegistration(cnpj)
        
        results.push({
          cnpj: checkResult.cnpj,
          hasRegistration: checkResult.hasRegistration,
          status: 'success',
          message: checkResult.hasRegistration ? 'CNPJ já possui cadastro na Regularize' : 'CNPJ não possui cadastro na Regularize',
          finalUrl: checkResult.finalUrl,
          method: checkResult.method,
          evidence: checkResult.evidence,
          timestamp: checkResult.timestamp
        })
        
        console.log(`CNPJ ${cnpj}: ${checkResult.hasRegistration ? 'JÁ CADASTRADO' : 'DISPONÍVEL'} (${checkResult.method})`)
        
      } catch (error) {
        console.error(`Erro ao processar CNPJ ${cnpj}:`, error)
        results.push({
          cnpj,
          hasRegistration: null,
          status: 'error',
          message: `Erro ao consultar: ${error.message}`,
          finalUrl: 'error',
          method: 'error',
          evidence: `Error: ${error.message}`,
          timestamp: new Date().toISOString()
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
