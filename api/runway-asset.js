// Vercel Serverless Function for Runway Asset Normalization & Ephemeral Upload
import { normalizeAndUploadRunwayAssetServer } from '../lib/runwayAssetNormalize.js'
import { rateLimit, clientIp } from '../lib/rateLimit.js'

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-runway-key')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  const rl = rateLimit(clientIp(req.headers))
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: { message: 'Too many requests — slow down a moment and try again.' } })
  }

  const apiKey = req.headers['x-runway-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '')
  if (!apiKey) {
    return res.status(400).json({ error: { message: 'Missing Runway API key' } })
  }

  const { url, filename } = req.body || {}
  if (!url) {
    return res.status(400).json({ error: { message: 'Missing url parameter in body' } })
  }

  try {
    const result = await normalizeAndUploadRunwayAssetServer({
      sourceUrl: url,
      filename: filename || 'reference.jpg',
      apiKey,
    })
    return res.status(200).json(result)
  } catch (err) {
    console.error('[Runway Asset Upload Error]', err.message)
    return res.status(500).json({ error: { message: err.message } })
  }
}
