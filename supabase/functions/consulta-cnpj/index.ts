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
    console.log(`Consultando CNPJ ${formattedCNPJ} no Regularize usando browser simulation`)
    
    return await checkCnpjWithBrowserSimulation(cnpj, formattedCNPJ, timestamp)
    
  } catch (error) {
    console.error(`Erro ao consultar CNPJ ${formattedCNPJ}:`, error)
    return {
      cnpj: formattedCNPJ,
      hasRegistration: false,
      finalUrl: '',
      method: 'error',
      evidence: `Error: ${error.message}`,
      timestamp
    }
  }
}

async function checkCnpjWithBrowserSimulation(cnpj: string, formattedCNPJ: string, timestamp: string): Promise<CNPJCheckResult> {
  console.log(`🚀 =================================`)
  console.log(`🚀 INICIANDO BROWSER SIMULATION PARA: ${formattedCNPJ}`)
  console.log(`🚀 =================================`)
  
  try {
    // Step 1: Initialize browser session
    console.log(`🚀 STEP 1: Inicializando sessão do navegador...`)
    const sessionCookies = new Map<string, string>()
    
    // Load initial page with proper browser headers
    const initialResponse = await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    // Extract session cookies
    const setCookieHeaders = initialResponse.headers.get('set-cookie')
    if (setCookieHeaders) {
      const cookies = setCookieHeaders.split(',')
      cookies.forEach(cookie => {
        const [nameValue] = cookie.trim().split(';')
        const [name, value] = nameValue.split('=')
        if (name && value) {
          sessionCookies.set(name.trim(), value.trim())
        }
      })
    }
    
    const pageContent = await initialResponse.text()
    console.log(`🚀 STEP 1 COMPLETO: Página carregada (${pageContent.length} chars)`)
    console.log(`🚀 Cookies da sessão: ${sessionCookies.size} encontrados`)
    
    // Step 2: Submit CNPJ with Angular form simulation
    console.log(`🚀 STEP 2: Simulando submit Angular para CNPJ ${cnpj}...`)
    
    const cookieString = Array.from(sessionCookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
    
    // Simulate Angular form submission with proper headers
    const submitResponse = await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://www.regularize.pgfn.gov.br',
        'Referer': 'https://www.regularize.pgfn.gov.br/cadastro',
        'Cookie': cookieString,
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: `identificacao=${encodeURIComponent(cnpj)}`,
      redirect: 'manual'
    })
    
    console.log(`🚀 STEP 2 COMPLETO: Status ${submitResponse.status}`)
    
    // Step 3: Analyze response for redirect or content
    let finalUrl = ''
    let evidence = ''
    let method = 'redirect_analysis'
    
    if (submitResponse.status >= 300 && submitResponse.status < 400) {
      // JavaScript redirect detected
      const location = submitResponse.headers.get('location')
      if (location) {
        finalUrl = location.startsWith('http') ? location : `https://www.regularize.pgfn.gov.br${location}`
        console.log(`🚀 REDIRECT DETECTADO: ${finalUrl}`)
        evidence = `JavaScript redirect para: ${finalUrl}`
      }
    } else if (submitResponse.status === 200) {
      const responseContent = await submitResponse.text()
      finalUrl = submitResponse.url || 'https://www.regularize.pgfn.gov.br/cadastro'
      
      console.log(`🚀 STEP 3: Analisando resposta (${responseContent.length} chars)...`)
      
      // Check for hCaptcha challenge
      if (responseContent.includes('hcaptcha.com') || responseContent.includes('h-captcha')) {
        console.log(`🚀 hCaptcha detectado, resolvendo com SolveCaptcha...`)
        const captchaResult = await solveCaptchaChallenge(responseContent, cnpj, cookieString)
        finalUrl = captchaResult.finalUrl
        evidence = captchaResult.evidence
        method = 'captcha_resolved'
      } else {
        // Check for Angular route changes or content indicators
        const registeredIndicators = [
          'já foi realizado o cadastro',
          'já está cadastrado', 
          'cadastro já foi efetuado',
          'já existe cadastro para este CNPJ',
          'Este CNPJ já possui cadastro',
          'Contribuinte já cadastrado'
        ]
        
        const availableIndicators = [
          'Dados do Contribuinte',
          'dados-contribuinte',
          'cnpj/dados',
          'Prosseguir com o cadastro',
          'informar os dados'
        ]
        
        const hasRegistered = registeredIndicators.some(indicator => 
          responseContent.toLowerCase().includes(indicator.toLowerCase())
        )
        
        const hasAvailable = availableIndicators.some(indicator => 
          responseContent.toLowerCase().includes(indicator.toLowerCase())
        )
        
        if (hasRegistered) {
          evidence = 'Angular component indicando CNPJ já cadastrado'
          method = 'angular_content_analysis'
        } else if (hasAvailable) {
          evidence = 'Angular component permitindo prosseguir com cadastro'
          method = 'angular_content_analysis'
          // Update URL to reflect successful form acceptance
          finalUrl = 'https://www.regularize.pgfn.gov.br/cadastro/cnpj'
        } else {
          evidence = 'Conteúdo Angular não reconhecido'
          method = 'angular_unknown'
        }
      }
    } else {
      finalUrl = 'https://www.regularize.pgfn.gov.br/cadastro'
      evidence = `Erro HTTP: ${submitResponse.status}`
      method = 'http_error'
    }
    
    // Step 4: Determine final status based on URL analysis
    const hasRegistration = determineRegistrationStatusByUrl(finalUrl, evidence)
    
    console.log(`🚀 =================================`)
    console.log(`🚀 RESULTADO FINAL PARA CNPJ: ${formattedCNPJ}`)
    console.log(`🚀 Status: ${hasRegistration ? 'JÁ CADASTRADO' : 'DISPONÍVEL'}`)
    console.log(`🚀 Método: ${method}`)
    console.log(`🚀 URL Final: ${finalUrl}`)
    console.log(`🚀 Evidência: ${evidence}`)
    console.log(`🚀 =================================`)
    
    return {
      cnpj: formattedCNPJ,
      hasRegistration,
      finalUrl,
      evidence,
      method,
      timestamp
    }
    
  } catch (error) {
    console.error(`🚀 ERRO ao processar CNPJ ${formattedCNPJ}:`, error)
    return {
      cnpj: formattedCNPJ,
      hasRegistration: false,
      finalUrl: '',
      evidence: `Erro na simulação: ${error.message}`,
      method: 'simulation_error',
      timestamp
    }
  }
}

async function solveCaptchaChallenge(responseContent: string, cnpj: string, cookieString: string): Promise<{finalUrl: string, evidence: string}> {
  try {
    console.log(`🧩 Iniciando resolução do hCaptcha...`)
    
    // Extract hCaptcha sitekey from response
    const sitekeyMatch = responseContent.match(/data-sitekey="([^"]+)"/) || 
                        responseContent.match(/sitekey['"]\s*:\s*['"]([^'"]+)['"]/) ||
                        responseContent.match(/hcaptcha\.com[^"]*sitekey=([^&"]+)/)
    
    if (!sitekeyMatch) {
      console.log(`🧩 Sitekey do hCaptcha não encontrado no HTML`)
      return {
        finalUrl: 'https://www.regularize.pgfn.gov.br/cadastro',
        evidence: 'hCaptcha detectado mas sitekey não extraído'
      }
    }
    
    const sitekey = sitekeyMatch[1]
    console.log(`🧩 Sitekey extraído: ${sitekey}`)
    
    // Call SolveCaptcha API through secure backend
    const captchaToken = await callSolveCaptchaAPI(sitekey, 'https://www.regularize.pgfn.gov.br/cadastro')
    
    if (!captchaToken) {
      console.log(`🧩 Falha na resolução do captcha`)
      return {
        finalUrl: 'https://www.regularize.pgfn.gov.br/cadastro',
        evidence: 'SolveCaptcha API falhou na resolução'
      }
    }
    
    console.log(`🧩 hCaptcha resolvido, token obtido: ${captchaToken.substring(0, 20)}...`)
    
    // Retry form submission with solved captcha
    const retryResponse = await retryFormWithCaptcha(cnpj, captchaToken, cookieString)
    
    let finalUrl = retryResponse.url || 'https://www.regularize.pgfn.gov.br/cadastro'
    
    // Check for redirect after captcha resolution
    if (retryResponse.status >= 300 && retryResponse.status < 400) {
      const location = retryResponse.headers.get('location')
      if (location) {
        finalUrl = location.startsWith('http') ? location : `https://www.regularize.pgfn.gov.br${location}`
      }
    }
    
    console.log(`🧩 Formulário reenviado após captcha, URL final: ${finalUrl}`)
    
    return {
      finalUrl,
      evidence: `hCaptcha resolvido com sucesso, redirecionado para: ${finalUrl}`
    }
    
  } catch (error) {
    console.error(`🧩 Erro durante resolução do hCaptcha:`, error)
    return {
      finalUrl: 'https://www.regularize.pgfn.gov.br/cadastro',
      evidence: `Erro na resolução do hCaptcha: ${error.message}`
    }
  }
}

async function callSolveCaptchaAPI(sitekey: string, pageUrl: string): Promise<string | null> {
  try {
    const apiKey = Deno.env.get('SOLVECAPTCHA_API_KEY')
    if (!apiKey) {
      console.error(`🧩 SOLVECAPTCHA_API_KEY não configurada`)
      return null
    }
    
    console.log(`🧩 Chamando SolveCaptcha API para sitekey: ${sitekey}`)
    
    // Submit hCaptcha task to SolveCaptcha
    const submitResponse = await fetch('https://api.solvecaptcha.com/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientKey: apiKey,
        task: {
          type: 'HCaptchaTaskProxyless',
          websiteURL: pageUrl,
          websiteKey: sitekey,
        }
      })
    })
    
    const submitResult = await submitResponse.json()
    
    if (submitResult.errorId !== 0) {
      console.error(`🧩 Erro ao submeter task SolveCaptcha:`, submitResult.errorDescription)
      return null
    }
    
    const taskId = submitResult.taskId
    console.log(`🧩 Task SolveCaptcha criada: ${taskId}`)
    
    // Poll for captcha solution with timeout
    let attempts = 0
    const maxAttempts = 24 // 24 attempts * 5 seconds = 2 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      const resultResponse = await fetch('https://api.solvecaptcha.com/getTaskResult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientKey: apiKey,
          taskId: taskId
        })
      })
      
      const result = await resultResponse.json()
      
      if (result.errorId !== 0) {
        console.error(`🧩 Erro ao obter resultado SolveCaptcha:`, result.errorDescription)
        return null
      }
      
      if (result.status === 'ready') {
        console.log(`🧩 hCaptcha resolvido com sucesso em ${attempts + 1} tentativas!`)
        return result.solution.gRecaptchaResponse
      }
      
      if (result.status === 'processing') {
        console.log(`🧩 Aguardando resolução... (${attempts + 1}/${maxAttempts})`)
        attempts++
        continue
      }
      
      console.error(`🧩 Status inesperado do SolveCaptcha:`, result.status)
      return null
    }
    
    console.error(`🧩 Timeout: hCaptcha não foi resolvido em 2 minutos`)
    return null
    
  } catch (error) {
    console.error(`🧩 Erro na SolveCaptcha API:`, error)
    return null
  }
}

async function retryFormWithCaptcha(cnpj: string, captchaToken: string, cookieString: string): Promise<Response> {
  console.log(`🔄 Reenviando formulário com token do hCaptcha...`)
  
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': 'https://www.regularize.pgfn.gov.br',
    'Referer': 'https://www.regularize.pgfn.gov.br/cadastro',
    'Cookie': cookieString,
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
  
  // Build form data with captcha tokens
  const formBody = `identificacao=${encodeURIComponent(cnpj)}&h-captcha-response=${encodeURIComponent(captchaToken)}&g-recaptcha-response=${encodeURIComponent(captchaToken)}`
  
  console.log(`🔄 Enviando form com captcha para CNPJ: ${cnpj}`)
  
  return await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
    method: 'POST',
    headers,
    body: formBody,
    redirect: 'manual'
  })
}

function determineRegistrationStatusByUrl(finalUrl: string, evidence: string): boolean {
  console.log(`🎯 Determinando status final:`)
  console.log(`🎯 URL: ${finalUrl}`)
  console.log(`🎯 Evidência: ${evidence}`)
  
  if (!finalUrl) {
    console.log(`🎯 URL vazia - assumindo DISPONÍVEL`)
    return false
  }
  
  // Primary criteria: URL-based analysis (most reliable)
  if (finalUrl === 'https://www.regularize.pgfn.gov.br' || finalUrl === 'https://www.regularize.pgfn.gov.br/') {
    console.log(`🎯 Redirect para root - JÁ CADASTRADO`)
    return true
  }
  
  if (finalUrl.includes('/cadastro/cnpj') || finalUrl.includes('/cnpj/dados')) {
    console.log(`🎯 Redirect para fluxo CNPJ - DISPONÍVEL`)
    return false
  }
  
  // Secondary criteria: Content-based analysis
  if (evidence.toLowerCase().includes('já cadastrado') || 
      evidence.toLowerCase().includes('já foi realizado') ||
      evidence.toLowerCase().includes('já existe cadastro')) {
    console.log(`🎯 Evidência indica JÁ CADASTRADO`)
    return true
  }
  
  if (evidence.toLowerCase().includes('prosseguir com cadastro') ||
      evidence.toLowerCase().includes('dados do contribuinte') ||
      evidence.toLowerCase().includes('permitindo prosseguir')) {
    console.log(`🎯 Evidência indica DISPONÍVEL`)
    return false
  }
  
  // Default: if staying on cadastro page without clear indicators
  if (finalUrl.includes('/cadastro')) {
    console.log(`🎯 Permaneceu em /cadastro sem indicadores claros - assumindo DISPONÍVEL`)
    return false
  }
  
  console.log(`🎯 Caso não mapeado - assumindo DISPONÍVEL`)
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
        // Real CNPJ consultation using browser simulation
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
          finalUrl: '',
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