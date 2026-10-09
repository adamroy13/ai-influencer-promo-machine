import { rateLimit, clientIp } from '../lib/rateLimit.js'

export const config = { runtime: 'edge' }

const ALLOWED_PATH_PREFIXES = [
  '/image_to_video',
  '/text_to_video',
  '/text_to_image',
  '/tasks',
]

function isAllowedPath(path) {
  return ALLOWED_PATH_PREFIXES.some(p => path.startsWith(p))
}

export default async function handler(req) {
  const url = new URL(req.url)

  let path = '/' + (url.searchParams.get('__path') || '').replace(/^\/+/, '')
  if (!path || path === '/') {
    path = url.pathname.replace(/^\/api\/runway/, '')
  }
  if (!path.startsWith('/')) path = '/' + path
  url.searchParams.delete('__path')
  const qs = url.searchParams.toString()
  const search = qs ? `?${qs}` : ''

  const origin = req.headers.get('origin') || '*'
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-runway-key',
    'Access-Control-Allow-Credentials': 'true',
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (!isAllowedPath(path)) {
    return new Response(JSON.stringify({ error: { message: 'Invalid Runway API path: ' + path } }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = req.headers.get('x-runway-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'Missing Runway API key' } }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rl = rateLimit(clientIp(req.headers))
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: { message: 'Too many requests — slow down a moment and try again.' } }), {
      status: 429,
      headers: { ...corsHeaders, 'Retry-After': String(rl.retryAfter), 'Content-Type': 'application/json' },
    })
  }

  const target = `https://api.dev.runwayml.com/v1${path}${search}`

  const forwardHeaders = new Headers()
  forwardHeaders.set('Authorization', `Bearer ${apiKey}`)
  forwardHeaders.set('X-Runway-Version', '2024-11-06')
  forwardHeaders.set('Content-Type', 'application/json')

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    })

    const respHeaders = new Headers(corsHeaders)
    for (const [k, v] of upstream.headers.entries()) {
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(k)) continue
      respHeaders.set(k, v)
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: e.message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
