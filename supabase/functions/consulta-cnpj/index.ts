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
    console.log(`Consultando CNPJ ${formattedCNPJ} no Regularize usando fluxo simulado`)
    
    // Simulate Playwright flow
    return await simulatePlaywrightFlow(cnpj, formattedCNPJ, timestamp)
    
  } catch (error) {
    console.error(`Erro ao consultar CNPJ ${formattedCNPJ}:`, error)
    return {
      cnpj: formattedCNPJ,
      hasRegistration: false,
      finalUrl: 'error',
      method: 'error',
      evidence: `Error: ${error.message}`,
      timestamp
    }
  }
}

async function simulatePlaywrightFlow(cnpj: string, formattedCNPJ: string, timestamp: string): Promise<CNPJCheckResult> {
  console.log(`Simulando fluxo Playwright para CNPJ ${formattedCNPJ}`)
  
  try {
    // Step 1: Get the initial page to extract any necessary tokens
    const initialResponse = await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    const pageContent = await initialResponse.text()
    console.log(`Página inicial carregada, tamanho: ${pageContent.length} chars`)
    
    // Extract potential CSRF tokens or session data
    const csrfToken = extractCSRFToken(pageContent)
    const cookies = extractCookies(initialResponse.headers)
    
    // Step 2: Submit CNPJ form (simulating button click)
    const submitResponse = await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Referer': 'https://www.regularize.pgfn.gov.br/cadastro',
        'Origin': 'https://www.regularize.pgfn.gov.br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Cookie': cookies
      },
      body: buildFormData(cnpj, csrfToken),
      redirect: 'manual'
    })
    
    console.log(`Submit response status: ${submitResponse.status}`)
    
    // Step 3: Handle response and redirects
    let finalUrl = ''
    let method = 'form_submission'
    let evidence = ''
    
    if (submitResponse.status >= 300 && submitResponse.status < 400) {
      // Redirect detected
      const location = submitResponse.headers.get('location')
      if (location) {
        finalUrl = location.startsWith('http') ? location : `https://www.regularize.pgfn.gov.br${location}`
        console.log(`Redirect detectado para: ${finalUrl}`)
        method = 'redirect_analysis'
        evidence = `HTTP ${submitResponse.status} redirect to ${finalUrl}`
      }
    } else if (submitResponse.status === 200) {
      // Page returned normally, check content
      const responseContent = await submitResponse.text()
      finalUrl = submitResponse.url || 'https://www.regularize.pgfn.gov.br/cadastro'
      
      console.log(`Response content preview: ${responseContent.substring(0, 1000)}...`)
      
      // Check for hCaptcha
      if (responseContent.includes('hcaptcha.com') || responseContent.includes('h-captcha')) {
        console.log('hCaptcha detectado na resposta')
        const captchaResult = await handleHCaptcha(responseContent, finalUrl)
        if (captchaResult.success) {
          // Retry submission with captcha token
          const retryResult = await retryWithCaptcha(cnpj, csrfToken, cookies, captchaResult.token!)
          finalUrl = retryResult.finalUrl
          method = 'captcha_solved_redirect'
          evidence = `hCaptcha solved, redirected to ${finalUrl}`
        } else {
          method = 'captcha_failed'
          evidence = `hCaptcha resolution failed: ${captchaResult.error}`
        }
      } else {
        // Analyze content for form indicators
        method = 'content_analysis'
        evidence = `Content analysis of ${responseContent.length} chars`
        
        // Check for "already registered" modal message - CRITICAL CHECK FIRST
        if (responseContent.includes('já está cadastrado') || 
            responseContent.includes('Efetue login') ||
            responseContent.includes('CNPJ informado já está cadastrado') ||
            responseContent.includes('login com senha para continuar')) {
          finalUrl = 'https://www.regularize.pgfn.gov.br'
          method = 'modal_already_registered'
          evidence = 'Modal "CNPJ já está cadastrado" detected in response content'
          console.log('🔍 MODAL DETECTADO: CNPJ já está cadastrado')
        }
        // Check for registration form indicators (new registration)
        else if (responseContent.includes('cpf do responsável') || 
                 responseContent.includes('data de nascimento') || 
                 responseContent.includes('nome da mãe') ||
                 responseContent.includes('confirmar senha')) {
          finalUrl = 'https://www.regularize.pgfn.gov.br/cadastro/cnpj'
          method = 'registration_form_detected'
          evidence = 'Registration form fields detected'
          console.log('🔍 FORMULÁRIO DETECTADO: Campos de cadastro encontrados')
        } 
        // Fallback analysis
        else {
          console.log('🔍 FALLBACK: Analisando conteúdo genérico')
          if (responseContent.includes('login') || responseContent.includes('senha')) {
            finalUrl = 'https://www.regularize.pgfn.gov.br'
          } else {
            finalUrl = 'https://www.regularize.pgfn.gov.br/cadastro/cnpj'
          }
        }
      }
    }
    
    // Step 4: Determine registration status based on final URL
    const hasRegistration = determineRegistrationStatus(finalUrl)
    
    console.log(`CNPJ ${formattedCNPJ}: ${hasRegistration ? 'JÁ CADASTRADO' : 'DISPONÍVEL'} (${method})`)
    
    return {
      cnpj: formattedCNPJ,
      hasRegistration,
      finalUrl,
      method,
      evidence,
      timestamp
    }
    
  } catch (error) {
    console.error(`Erro no fluxo simulado para CNPJ ${formattedCNPJ}:`, error)
    return {
      cnpj: formattedCNPJ,
      hasRegistration: false,
      finalUrl: 'error',
      method: 'error',
      evidence: `Simulation error: ${error.message}`,
      timestamp
    }
  }
}

function extractCSRFToken(html: string): string {
  // Try to extract CSRF token from various common patterns
  const patterns = [
    /<meta name="_token" content="([^"]+)"/i,
    /<input type="hidden" name="_token" value="([^"]+)"/i,
    /<meta name="csrf-token" content="([^"]+)"/i,
    /name="__RequestVerificationToken" value="([^"]+)"/i
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[1]
  }
  
  return ''
}

function extractCookies(headers: Headers): string {
  const cookies: string[] = []
  for (const [name, value] of headers.entries()) {
    if (name.toLowerCase() === 'set-cookie') {
      cookies.push(value.split(';')[0])
    }
  }
  return cookies.join('; ')
}

function buildFormData(cnpj: string, csrfToken: string): string {
  const params = new URLSearchParams()
  params.append('cnpj', cnpj.replace(/\D/g, '')) // Only numbers
  params.append('tipoPessoa', 'J')
  if (csrfToken) params.append('_token', csrfToken)
  return params.toString()
}

async function handleHCaptcha(content: string, pageUrl: string): Promise<{success: boolean, token?: string, error?: string}> {
  try {
    const solveCaptchaApiKey = Deno.env.get('SOLVECAPTCHA_API_KEY')
    if (!solveCaptchaApiKey) {
      return { success: false, error: 'SolveCaptcha API key not configured' }
    }
    
    // Extract hCaptcha sitekey
    const sitekeyMatch = content.match(/data-sitekey=["']([^"']+)["']/i) || 
                        content.match(/sitekey["']?\s*:\s*["']([^"']+)["']/i)
    
    if (!sitekeyMatch) {
      return { success: false, error: 'hCaptcha sitekey not found' }
    }
    
    const sitekey = sitekeyMatch[1]
    console.log(`hCaptcha sitekey detectado: ${sitekey}`)
    
    // Call SolveCaptcha API
    const captchaResponse = await fetch('https://api.solvecaptcha.com/solve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${solveCaptchaApiKey}`
      },
      body: JSON.stringify({
        type: 'hcaptcha',
        sitekey: sitekey,
        pageurl: pageUrl
      })
    })
    
    const captchaResult = await captchaResponse.json()
    
    if (captchaResult.success && captchaResult.token) {
      console.log('hCaptcha resolvido com sucesso')
      return { success: true, token: captchaResult.token }
    } else {
      return { success: false, error: captchaResult.error || 'Captcha resolution failed' }
    }
    
  } catch (error) {
    return { success: false, error: `Captcha handling error: ${error.message}` }
  }
}

async function retryWithCaptcha(cnpj: string, csrfToken: string, cookies: string, captchaToken: string): Promise<{finalUrl: string}> {
  try {
    const params = new URLSearchParams()
    params.append('cnpj', cnpj.replace(/\D/g, ''))
    params.append('tipoPessoa', 'J')
    params.append('h-captcha-response', captchaToken)
    if (csrfToken) params.append('_token', csrfToken)
    
    const response = await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies,
        'Referer': 'https://www.regularize.pgfn.gov.br/cadastro',
        'Origin': 'https://www.regularize.pgfn.gov.br'
      },
      body: params.toString(),
      redirect: 'manual'
    })
    
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        return { finalUrl: location.startsWith('http') ? location : `https://www.regularize.pgfn.gov.br${location}` }
      }
    }
    
    return { finalUrl: response.url || 'https://www.regularize.pgfn.gov.br/cadastro' }
    
  } catch (error) {
    console.error('Erro no retry com captcha:', error)
    return { finalUrl: 'error' }
  }
}

function determineRegistrationStatus(finalUrl: string): boolean {
  // Rule: If redirects back to base URL, CNPJ is already registered
  if (finalUrl === 'https://www.regularize.pgfn.gov.br' || 
      finalUrl === 'https://www.regularize.pgfn.gov.br/' ||
      finalUrl.includes('/login') ||
      finalUrl.includes('/dashboard') ||
      finalUrl.includes('/home')) {
    return true // JÁ CADASTRADO
  }
  
  // Rule: If goes to /cadastro/cnpj, CNPJ is available for registration
  if (finalUrl.includes('/cadastro/cnpj')) {
    return false // DISPONÍVEL
  }
  
  // Default to available if uncertain
  return false
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