import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts"

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
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const page = await browser.newPage()
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    let sitekeyFromRequest: string | null = null
    
    // Intercept network requests to capture sitekey
    page.on('request', req => {
      const url = req.url()
      if (url.includes('hcaptcha.com') && (url.includes('getcaptcha') || url.includes('api.js'))) {
        const urlObj = new URL(url)
        const sk = urlObj.searchParams.get('sitekey')
        if (sk) {
          sitekeyFromRequest = sk
          console.log(`Site key capturado da request: ${sk}`)
        }
      }
    })
    
    // Navigate to the page
    console.log('Navegando para a página do Regularize...')
    await page.goto('https://www.regularize.pgfn.gov.br/cadastro', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    // Wait for hCaptcha iframe to appear
    console.log('Aguardando carregamento do hCaptcha...')
    await page.waitForSelector('iframe[src*="hcaptcha.com"]', { timeout: 15000 })
    
    // Try multiple strategies to extract sitekey
    let siteKey: string | null = null
    
    // Strategy 1: Extract from div.h-captcha or element with data-sitekey
    console.log('Tentativa 1: Extraindo sitekey do elemento data-sitekey')
    siteKey = await page.evaluate(() => {
      const el = document.querySelector('div.h-captcha, [data-sitekey]')
      return el?.getAttribute('data-sitekey') || null
    })
    
    // Strategy 2: Extract from hCaptcha iframe URL
    if (!siteKey) {
      console.log('Tentativa 2: Extraindo sitekey da URL do iframe')
      const frames = page.frames()
      for (const frame of frames) {
        if (frame.url().includes('hcaptcha.com')) {
          const url = new URL(frame.url())
          siteKey = url.searchParams.get('sitekey')
          if (siteKey) break
        }
      }
    }
    
    // Strategy 3: Use captured sitekey from network requests
    if (!siteKey && sitekeyFromRequest) {
      console.log('Tentativa 3: Usando sitekey capturado das requests')
      siteKey = sitekeyFromRequest
    }
    
    // Strategy 4: Extract from script content
    if (!siteKey) {
      console.log('Tentativa 4: Extraindo sitekey do código JavaScript')
      const scripts = await page.$$eval('script', els => 
        els.map(e => e.textContent || '').join('\n')
      )
      const match = scripts.match(/hcaptcha\.render\([^)]*sitekey['"]?\s*:\s*['"]([^'"]+)['"]/i)
      siteKey = match?.[1] || null
    }
    
    if (!siteKey) {
      throw new Error('hCaptcha site key não encontrado usando nenhuma estratégia')
    }
    
    console.log(`hCaptcha site key encontrado: ${siteKey}`)
    
    // Step 3: Solve hCaptcha using SolveCaptcha API
    console.log('Resolvendo hCaptcha...')
    const captchaToken = await solvehCaptcha(siteKey, 'https://www.regularize.pgfn.gov.br/cadastro', solveCaptchaApiKey)
    console.log('hCaptcha resolvido com sucesso')
    
    // Step 4: Submit the form with CNPJ and captcha token using Puppeteer
    console.log('Preenchendo formulário...')
    
    // Fill the CNPJ field
    await page.type('input[name="cpfCnpj"]', cnpj)
    
    // Inject the captcha token
    await page.evaluate((token) => {
      const hCaptchaResponse = document.querySelector('textarea[name="h-captcha-response"]') as HTMLTextAreaElement
      const gRecaptchaResponse = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement
      
      if (hCaptchaResponse) hCaptchaResponse.value = token
      if (gRecaptchaResponse) gRecaptchaResponse.value = token
    }, captchaToken)
    
    console.log('Submetendo formulário...')
    
    // Submit the form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.click('button[type="submit"], input[type="submit"]')
    ])
    
    const currentUrl = page.url()
    console.log(`URL após submissão: ${currentUrl}`)
    
    // Get page content to analyze
    const pageContent = await page.content()
    
    // Analyze the response to determine if CNPJ has registration
    if (currentUrl.includes('regularize.pgfn.gov.br') && !currentUrl.includes('cadastro')) {
      // Redirected away from cadastro page = already registered
      return true
    } else if (pageContent.includes('já cadastrado') || pageContent.includes('CNPJ informado já está cadastrado')) {
      // Content indicates already registered
      return true
    } else if (pageContent.includes('nome') && pageContent.includes('email')) {
      // Form fields present = available for registration
      return false
    }
    
    // Default to not registered if we can access the form
    return false
    
  } catch (error) {
    console.error(`Error consulting CNPJ ${cnpj}:`, error)
    throw error
  } finally {
    await browser.close()
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