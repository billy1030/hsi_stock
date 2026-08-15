/**
 * hsiq-plugin.mjs — HSI Stock Quote via ETNet (native Cordis plugin)
 * =================================================================
 * A self-contained, ZERO-import Cordis plugin. It can be loaded by the
 * harness composition loader from a relative `./hsiq-plugin.mjs` row in an
 * agent preset, or replayed dynamically through cordis_define (the dynamic
 * sandbox path uses the same apply() body — only the tool registration helper
 * differs, detected via the presence of the sandbox `harness` global).
 *
 * What it does (ports the logic from /Users/billylam/ai/hsi_stock backend):
 *   1. Registers a curl-backed `http` fetch provider on ctx.web, making
 *      web.fetch work in deployments that have no fetch provider.
 *   2. Provides an `etnet` service: quote(code) and hsi().
 *   3. Registers model tools etnet_quote and etnet_hsi.
 *
 * All side effects are fiber-owned: ctx.on('dispose') unwinds provider,
 * service, and tools when the plugin stops.
 *
 * NOTE: node_modules imports are intentionally absent — a file outside the
 * harness checkout cannot resolve @deepseek-ai/* bare specifiers, so the tool
 * definitions are hand-rolled object literals that ctx.tools.register accepts.
 */

// ---------------------------------------------------------------------------
// Helpers used to build tool definitions. In the dynamic sandbox `harness`
// exists and validates/normalizes; in a native module we emit the plain
// ToolDefinition shape ctx.tools.register() accepts.
// ---------------------------------------------------------------------------
function makeToolDefinition(name, description, parameters, execute) {
  const definition = {
    name,
    description,
    parameters,
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value) {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
    },
    async execute(args) {
      return await execute(args)
    },
  }
  // Sandbox path: let the harness validate + wrap (returns a marker-tagged
  // definition that harness.registerTool requires). Native path: as-is.
  if (typeof harness !== 'undefined') return harness.defineTool(definition)
  return definition
}

export default {
  name: 'hsiq-etnet',
  // `tools` is a hard dependency: the plugin's whole point is registering model tools.
  inject: ['tools'],
  apply(ctx) {
    const web = ctx.get('web')
    const shell = ctx.get('shell')
    if (web === undefined || shell === undefined) {
      console.log('hsiq: web or shell service unavailable; plugin idle')
      return
    }

    // ---- 1. curl-backed fetch provider on ctx.web -----------------------
    const buildCurl = (url) => {
      const safe = url.replace(/'/g, "'\\''")
      return "curl -s -L --max-time 20 -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' -H 'Accept: text/html,application/xhtml+xml,text/*;q=0.9' -w '\\n__DSH_STATUS__%{http_code}__' '" + safe + "'"
    }

    let disposeProvider = () => {}
    try {
      const provider = {
        id: 'http',
        available() {
          return true
        },
        async fetch(request) {
          const url = String(request.url)
          const spec = shell.resolve({
            command: buildCurl(url),
            timeoutMs: 25000,
            stdoutMaxBytes: 4000000,
          })
          const result = await shell.run(spec)
          const out = result.stdout ? result.stdout.text || '' : ''
          const marker = out.lastIndexOf('__DSH_STATUS__')
          let content = out
          let statusCode = 200
          if (marker !== -1) {
            content = out.slice(0, marker)
            const m = out.slice(marker).match(/(\d{3})__/)
            if (m) statusCode = parseInt(m[1], 10)
          }
          return {
            url,
            statusCode,
            body: { kind: 'html', content },
            truncated: !!(result.stdout && result.stdout.truncated),
          }
        },
      }
      disposeProvider = web.registerFetchProvider(provider)
    } catch (err) {
      // A duplicate provider id just means another fetch provider already
      // exists; web.fetch will use it.
      console.log('hsiq: fetch provider already registered elsewhere; using existing: ' + (err && err.message ? err.message : String(err)))
    }
    ctx.on('dispose', () => disposeProvider())

    // ---- parsing helpers (regex-based; no cheerio in the sandbox) --------
    const clean = (s) =>
      s
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#\d+;/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    const first = (html, re) => {
      const m = html.match(re)
      return m ? m[1] : ''
    }
    const firstNum = (html, re) => {
      const m = html.match(re)
      if (!m) return ''
      const v = clean(m[1])
      return v === '&nbsp;' || v === '' ? '' : v
    }
    const allGroups = (html, re) => {
      const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
      const out = []
      let m
      while ((m = r.exec(html)) !== null) {
        out.push(m[1] !== undefined ? m[1] : m[0])
        if (m.index === r.lastIndex) r.lastIndex++
      }
      return out
    }
    const stripTags = (s) => String(s).replace(/<[^>]+>/g, ' ')
    const nowStr = () =>
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    async function fetchHtml(url) {
      const res = await web.fetch({ url })
      const content = res && res.body ? res.body.content || '' : ''
      return { statusCode: res ? res.statusCode : 0, content }
    }

    // Parse the unified quote page used for both stocks and ETFs today.
    function parseStockQuote(html, code, timestamp) {
      let name = ''
      let extractedCode = code
      const headerSpan = first(html, /<div id="StkQuoteHeader">\s*<span>([\s\S]*?)<\/span>/)
      const hm = headerSpan.match(/^(\d+)\s+(.+)$/)
      if (hm) {
        extractedCode = hm[1]
        name = clean(hm[2])
      } else {
        name = clean(headerSpan)
      }
      if (!name) {
        const title = first(html, /<title>([^<]*)<\/title>/)
        if (title.includes('港股報價')) {
          const parts = title.split('|')
          if (parts.length > 1) name = clean(parts[1])
        }
      }

      const mb = first(html, /<div id="StkDetailMainBox">([\s\S]*?)(?:<!-- End Blue Box -->|<div id="StkBg"|$)/)
      const price = firstNum(mb, /class="Price[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/span>/)
      const change = firstNum(mb, /class="Change"[^>]*>\s*([\s\S]*?)\s*<\/span>/)

      // label -> value map from the styleB cells (order-independent)
      const fieldMap = {}
      for (const block of allGroups(html, /<td class="styleB"([\s\S]*?)<\/td>/)) {
        const label = clean(stripTags(first(block, /^([\s\S]*?)(?:<br|<\/a>)/)))
        const val = firstNum(block, /class="Number[^"]*"[^>]*>([\s\S]*?)<\/span>/)
        if (label) fieldMap[label] = val
      }
      const byLabel = (key) => {
        if (fieldMap[key]) return fieldMap[key]
        for (const k of Object.keys(fieldMap)) if (k.startsWith(key)) return fieldMap[k]
        return ''
      }

      const yearHigh = firstNum(html, /52周高\s*([\d,.]+)/)
      const yearLow = firstNum(html, /52周低\s*([\d,.]+)/)

      return {
        code: extractedCode,
        name,
        price,
        change,
        highest: byLabel('最高'),
        lowest: byLabel('最低'),
        volume: byLabel('成交股數'),
        turnover: byLabel('成交金額'),
        prevClose: byLabel('前收市'),
        open: byLabel('開市'),
        monthHigh: byLabel('1個月最高'),
        monthLow: byLabel('1個月最低'),
        yearHigh,
        yearLow,
        marketCap: byLabel('市值'),
        shortSell: byLabel('賣空金額'),
        timestamp,
        marketOpen: price !== '',
        isEtf: false,
      }
    }

    // Legacy ETF page fallback (older /www/tc/etf/quote/ layout).
    function parseETFQuote(html, code, timestamp) {
      const title = first(html, /<title>([^<]*)<\/title>/)
      let name = ''
      let extractedCode = code
      const parts = title.split('|')
      if (parts.length > 1) name = clean(parts[1])
      const cm = parts[0] ? parts[0].match(/^(\d+)/) : null
      if (cm) extractedCode = cm[1]
      if (!name) name = firstNum(html, /class="quote-name"[^>]*>([\s\S]*?)</)

      const price = firstNum(html, /<li class="nominal"[^>]*>([\s\S]*?)<\/li>/)
      const changeVal = firstNum(html, /<li class="change"[^>]*>([\s\S]*?)<\/li>/)
      const changePct = firstNum(html, /<li class="percentagechange"[^>]*>([\s\S]*?)<\/li>/)
      const change = (changeVal + ' ' + changePct).trim()

      const etfData = {}
      const region = first(html, /class="quote-field-list"([\s\S]*?)(?:<\/div>\s*<\/div>\s*<\/div>|$)/)
      for (const ul of allGroups(region, /<ul[^>]*>([\s\S]*?)<\/ul>/)) {
        const lis = allGroups(ul, /<li[^>]*>([\s\S]*?)<\/li>/)
        if (lis.length < 2) continue
        const key = clean(stripTags(lis[0]))
        const sp = lis[1].match(/class="sparkline"[^>]*data-sparkline_min="([^"]*)"[^>]*data-sparkline_max="([^"]*)"/)
        if (sp) {
          etfData[key + '_min'] = sp[1]
          etfData[key + '_max'] = sp[2]
        }
        etfData[key] = clean(stripTags(lis[1]))
      }
      const g = (k) => etfData[k] || ''

      return {
        code: extractedCode,
        name,
        price,
        change,
        highest: g('最高'),
        lowest: g('最低'),
        volume: g('成交股數'),
        turnover: g('成交金額'),
        prevClose: g('前收市'),
        open: g('開市#') || g('開市'),
        monthHigh: g('1個月高低_max'),
        monthLow: g('1個月高低_min'),
        yearHigh: g('52周高低_max'),
        yearLow: g('52周高低_min'),
        marketCap: g('市值'),
        shortSell: g('賣空金額').replace(/\*$/, '').trim(),
        timestamp,
        marketOpen: price !== '',
        isEtf: true,
      }
    }

    async function quote(rawCode) {
      const formattedCode = String(rawCode).padStart(5, '0')
      const url = 'https://www.etnet.com.hk/www/tc/stocks/realtime/quote.php?code=' + formattedCode
      try {
        const { statusCode, content } = await fetchHtml(url)
        if (!content) return { ok: false, error: 'Failed to fetch quote page (HTTP ' + statusCode + ')', code: formattedCode }
        // legacy ETF JS redirect
        const redir = content.match(/window\.location\.href\s*=\s*["'](\/www\/tc\/etf\/quote\/[^"']+)["']/)
        if (redir) {
          const etfRes = await fetchHtml('https://www.etnet.com.hk' + redir[1])
          const parsed = parseETFQuote(etfRes.content, formattedCode, nowStr())
          if (parsed.price) {
            parsed.ok = true
            return parsed
          }
        }
        const parsed = parseStockQuote(content, formattedCode, nowStr())
        if (!parsed.name) return { ok: false, error: 'Stock ' + formattedCode + ' not found or page layout changed.', code: formattedCode }
        parsed.ok = true
        return parsed
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err), code: formattedCode }
      }
    }

    async function hsi() {
      const out = {
        label: '',
        value: '0',
        change: '0',
        hsiValue: '',
        hsiChange: '',
        futuresValue: '',
        futuresChange: '',
        high: '',
        low: '',
        yearHigh: '',
        yearLow: '',
      }
      try {
        const home = await fetchHtml('https://www.etnet.com.hk/www/tc/home/index.php')
        const html = home.content
        const card = first(html, /恒指<\/label>([\s\S]*?)(?:<input type="radio"|$)/)

        const m = card.match(/class="nominal arrow (?:up|down)">([\d,]+\.?\d*)<\/div>\s*<div>([+-][\d,.]+)<\/div>\s*<div>\(([^)]+)\)/)
        if (m) {
          out.hsiValue = m[1]
          out.hsiChange = m[2] + ' (' + m[3] + ')'
        }

        const sp = card.match(/data-sparkline_min="([^"]+)"[^>]*data-sparkline_max="([^"]+)"/)
        if (sp) {
          out.yearLow = sp[1]
          out.yearHigh = sp[2]
        }

        const futuresBlock = (card || '').match(/class="futures">([\s\S]*?)(?:<\/div>\s*<\/div>\s*<\/a>)/)
        if (futuresBlock) {
          const vm = futuresBlock[1].match(/class="arrow (?:up|down)">([\d,]+)<\/div>\s*<div>([+-][\d,]+)/)
          if (vm) {
            out.futuresValue = vm[1]
            out.futuresChange = vm[2]
          }
        }
        if (!out.futuresValue) {
          const night = first(html, /夜期<\/label>([\s\S]*?)(?:<input type="radio"|$)/)
          const vm2 = (night || '').match(/class="nominal arrow (?:up|down)">([\d,]+)<\/div>\s*<div>([+-][\d,]+)/)
          if (vm2) {
            out.futuresValue = vm2[1]
            out.futuresChange = vm2[2]
          }
        }

        // intraday high/low from the index detail page
        try {
          const detail = await fetchHtml('https://www.etnet.com.hk/www/tc/stocks/indexes_detail.php?subtype=hsi')
          const d = detail.content
          out.high = firstNum(d, /最高\s*([\d,.]+)/)
          out.low = firstNum(d, /最低\s*([\d,.]+)/)
        } catch (err) {
          // detail page is optional
        }

        // pre-9:30 -> futures headline; after 9:30 -> HSI only (local time)
        const now = new Date()
        const isBefore930 = now.getHours() < 9 || (now.getHours() === 9 && now.getMinutes() < 30)
        if (isBefore930) {
          if (out.futuresValue) {
            out.label = '期指'
            out.value = out.futuresValue
            out.change = out.futuresChange
          } else if (out.hsiValue) {
            out.label = '恒指'
            out.value = out.hsiValue
            out.change = out.hsiChange
          } else {
            out.label = '期指'
          }
        } else {
          out.label = '恒指'
          out.value = out.hsiValue || '0'
          out.change = out.hsiChange || '0'
        }
        out.updatedAt = now.toISOString()
        return out
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err), ...out }
      }
    }

    // ---- 2. public `etnet` service --------------------------------------
    const service = { quote, hsi }
    let disposeService = () => {}
    try {
      disposeService = ctx.provide('etnet', service)
    } catch (err) {
      console.log('hsiq: could not provide etnet service: ' + (err && err.message ? err.message : String(err)))
    }
    ctx.on('dispose', () => disposeService())

    // ---- 3. model tools ---------------------------------------------------
    const disposers = []
    disposers.push(
      ctx.tools.register(
        makeToolDefinition(
          'etnet_quote',
          'Fetch a live HK stock or ETF quote from ETNet HK (www.etnet.com.hk) for a Hang Seng Index-listed code. Handles both ordinary stocks and ETFs (e.g. 2513 Z.AI, 07709 XL2 CSOP Hynix). After market close, price fields may be empty (data available flag = false).',
          {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'HK stock code, with or without leading zeros (e.g. "2513", "02513", "7709")' },
            },
            required: ['code'],
          },
          async (args) => await quote(args.code),
        ),
      ),
    )
    disposers.push(
      ctx.tools.register(
        makeToolDefinition(
          'etnet_hsi',
          'Fetch the current Hang Seng Index (恒指) snapshot from ETNet HK: HSI value and change, 期指 futures value and change, session high/low, and 52-week high/low. Before 09:30 the headline uses 期指; after 09:30 it uses 恒指 only.',
          { type: 'object', properties: {}, required: [] },
          async () => await hsi(),
        ),
      ),
    )
    ctx.on('dispose', () => disposers.forEach((d) => d()))

    console.log('hsiq: ETNet quote/hsi tools + etnet service active')
  },
}
