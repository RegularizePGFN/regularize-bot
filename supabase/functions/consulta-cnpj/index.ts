import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cnpjs } = await req.json()
    const solveCaptchaApiKey = Deno.env.get('SOLVECAPTCHA_API_KEY')
    
    if (!solveCaptchaApiKey) {
      throw new Error('SolveCaptcha API key not configured')
    }

    console.log(`Iniciando consulta para ${cnpjs.length} CNPJs`)
    const results = []
    
    for (const cnpj of cnpjs) {
      console.log(`Consultando CNPJ: ${cnpj}`)
      
      try {
        const hasRegistration = await consultarCNPJRegularize(cnpj, solveCaptchaApiKey)
        
        results.push({
          cnpj,
          hasRegistration,
          status: 'success',
          message: hasRegistration ? 'CNPJ já possui cadastro na Regularize' : 'CNPJ não possui cadastro na Regularize'
        })
        
        console.log(`CNPJ ${cnpj}: ${hasRegistration ? 'JÁ CADASTRADO' : 'DISPONÍVEL'}`)
        
      } catch (error) {
        console.error(`Error checking CNPJ ${cnpj}:`, error)
        results.push({
          cnpj,
          hasRegistration: null,
          status: 'error',
          message: `Erro ao consultar: ${error.message}`
        })
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results
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

async function consultarCNPJRegularize(cnpj: string, solveCaptchaApiKey: string): Promise<boolean> {
  console.log(`Acessando site Regularize para CNPJ: ${cnpj}`)
  
  try {
    // Step 1: Load the page and get the form
    const pageResponse = await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    if (!pageResponse.ok) {
      throw new Error(`Failed to load page: ${pageResponse.status}`)
    }
    
    const pageHtml = await pageResponse.text()
    console.log('Página carregada com sucesso')
    
    // Step 2: Extract hCaptcha site key and other form data
    console.log('Procurando hCaptcha site key na página...')
    
    // Try multiple patterns to find the hCaptcha site key
    let siteKeyMatch = pageHtml.match(/data-sitekey="([^"]+)"/)
    if (!siteKeyMatch) {
      siteKeyMatch = pageHtml.match(/sitekey:\s*["']([^"']+)["']/)
    }
    if (!siteKeyMatch) {
      siteKeyMatch = pageHtml.match(/hcaptcha.*?sitekey.*?["']([^"']+)["']/i)
    }
    if (!siteKeyMatch) {
      siteKeyMatch = pageHtml.match(/["']sitekey["']:\s*["']([^"']+)["']/)
    }
    
    if (!siteKeyMatch) {
      console.log('HTML excerpt for debugging:', pageHtml.substring(0, 2000))
      throw new Error('hCaptcha site key not found in page HTML')
    }
    
    const siteKey = siteKeyMatch[1]
    console.log(`hCaptcha site key encontrado: ${siteKey}`)
    
    // Step 3: Solve hCaptcha using SolveCaptcha API
    console.log('Resolvendo hCaptcha...')
    const captchaToken = await solvehCaptcha(siteKey, 'https://www.regularize.pgfn.gov.br/cadastro', solveCaptchaApiKey)
    console.log('hCaptcha resolvido com sucesso')
    
    // Step 4: Submit the form with CNPJ and captcha token
    const formData = new FormData()
    formData.append('cpfCnpj', cnpj)
    formData.append('h-captcha-response', captchaToken)
    formData.append('g-recaptcha-response', captchaToken)
    
    console.log('Enviando formulário...')
    const submitResponse = await fetch('https://www.regularize.pgfn.gov.br/cadastro', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.regularize.pgfn.gov.br/cadastro'
      },
      body: formData,
      redirect: 'manual'
    })
    
    console.log(`Response status: ${submitResponse.status}`)
    console.log(`Response headers:`, Object.fromEntries(submitResponse.headers.entries()))
    
    // Step 5: Analyze the response to determine if CNPJ has registration
    const finalUrl = submitResponse.headers.get('location') || submitResponse.url
    console.log(`Final URL: ${finalUrl}`)
    
    // If redirected back to main page or shows popup, CNPJ already has registration
    // If redirected to form page, CNPJ doesn't have registration
    if (finalUrl.includes('regularize.pgfn.gov.br') && !finalUrl.includes('cadastro')) {
      // Redirected to main page = already registered
      return true
    } else if (finalUrl.includes('cadastro') || submitResponse.status === 200) {
      // Stayed on cadastro page or form page = not registered
      const responseText = await submitResponse.text()
      
      // Check for specific indicators in the response
      if (responseText.includes('já cadastrado') || responseText.includes('CNPJ informado já está cadastrado')) {
        return true
      }
      
      // If form fields are present, it means the CNPJ is available for registration
      if (responseText.includes('nome') && responseText.includes('email')) {
        return false
      }
      
      // Default to not registered if we can access the form
      return false
    }
    
    // Default to not registered
    return false
    
  } catch (error) {
    console.error(`Error consulting CNPJ ${cnpj}:`, error)
    throw error
  }
}

async function solvehCaptcha(siteKey: string, pageUrl: string, apiKey: string): Promise<string> {
  console.log('Iniciando resolução do hCaptcha via SolveCaptcha API')
  
  // Submit captcha for solving
  const submitResponse = await fetch('https://api.solvecaptcha.com/createTask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientKey: apiKey,
      task: {
        type: 'HCaptchaTaskProxyless',
        websiteURL: pageUrl,
        websiteKey: siteKey
      }
    })
  })
  
  const submitResult = await submitResponse.json()
  
  if (submitResult.errorId !== 0) {
    throw new Error(`SolveCaptcha submit error: ${submitResult.errorDescription}`)
  }
  
  const taskId = submitResult.taskId
  console.log(`Task ID: ${taskId}`)
  
  // Poll for result
  let attempts = 0
  const maxAttempts = 60 // 5 minutes max
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    
    const resultResponse = await fetch('https://api.solvecaptcha.com/getTaskResult', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientKey: apiKey,
        taskId: taskId
      })
    })
    
    const result = await resultResponse.json()
    
    if (result.errorId !== 0) {
      throw new Error(`SolveCaptcha result error: ${result.errorDescription}`)
    }
    
    if (result.status === 'ready') {
      console.log('hCaptcha resolvido!')
      return result.solution.gRecaptchaResponse
    }
    
    console.log(`Tentativa ${attempts + 1}: Status = ${result.status}`)
    attempts++
  }
  
  throw new Error('Timeout waiting for captcha solution')
}