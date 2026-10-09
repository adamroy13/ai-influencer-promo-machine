// Runway-native asset normalization and ephemeral upload helper
import sharp from 'sharp'
import crypto from 'crypto'

// In-memory server cache: sha256(sourceUrl) -> { uri, meta, expiresAt }
// Runway ephemeral uploads are valid for 24 hours; we use a 20-hour TTL.
const serverAssetCache = new Map()
const CACHE_TTL_MS = 20 * 60 * 60 * 1000

function hashUrl(url) {
  return crypto.createHash('sha256').update(String(url)).digest('hex')
}

/**
 * Fetch source image, normalize to standard RGB JPEG (strip metadata, max 1400px, quality 85),
 * upload via Runway's official ephemeral uploads API (/v1/uploads), and return a runway:// URI.
 */
export async function normalizeAndUploadRunwayAssetServer({ sourceUrl, filename = 'reference.jpg', apiKey }) {
  if (!sourceUrl || typeof sourceUrl !== 'string') {
    throw new Error('Missing sourceUrl for Runway asset normalization')
  }
  if (!apiKey) {
    throw new Error('Missing Runway API key for asset upload')
  }

  // Already a Runway URI — return immediately
  if (sourceUrl.startsWith('runway://')) {
    const meta = {
      originalSourceType: 'runway',
      normalizedMime: 'image/jpeg',
      dimensions: 'native',
      byteSize: 0,
      isRunwayUri: true,
    }
    return { uri: sourceUrl, meta }
  }

  // Check server cache
  const cacheKey = hashUrl(sourceUrl)
  const cached = serverAssetCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    console.log('[Runway Asset Normalization (Server Cached)]', cached.meta)
    return { uri: cached.uri, meta: cached.meta, cached: true }
  }

  // 1. Fetch source image
  let sourceBuffer
  let originalSourceType = 'unknown'

  if (sourceUrl.startsWith('data:')) {
    const match = sourceUrl.match(/^data:([^;]+);base64,(.*)$/)
    if (!match) throw new Error('Invalid data URI format')
    originalSourceType = match[1] || 'data-uri'
    sourceBuffer = Buffer.from(match[2], 'base64')
  } else {
    const res = await fetch(sourceUrl)
    if (!res.ok) {
      throw new Error(`Failed to fetch source image from URL (${res.status}): ${res.statusText}`)
    }
    originalSourceType = res.headers.get('content-type') || 'unknown'
    sourceBuffer = Buffer.from(await res.arrayBuffer())
  }

  // 2. Inspect original metadata and normalize to standard JPEG
  const rawMeta = await sharp(sourceBuffer).metadata()
  const detectedFormat = rawMeta.format || originalSourceType

  // Convert to standard JPEG: RGB, strip metadata, max 1400px inside, quality 85
  const { data: normalizedBuf, info } = await sharp(sourceBuffer)
    .flatten({ background: '#ffffff' })
    .resize({
      width: 1400,
      height: 1400,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toFormat('jpeg', { quality: 85 })
    .withMetadata(false)
    .toBuffer({ resolveWithObject: true })

  // 3. Ephemeral upload to Runway (/v1/uploads)
  const uploadSlotRes = await fetch('https://api.dev.runwayml.com/v1/uploads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: filename || 'reference.jpg',
      type: 'ephemeral',
    }),
  })

  if (!uploadSlotRes.ok) {
    const errText = await uploadSlotRes.text().catch(() => '')
    throw new Error(`Runway upload slot request failed (${uploadSlotRes.status}): ${errText}`)
  }

  const slot = await uploadSlotRes.json()
  if (!slot.uploadUrl || !slot.runwayUri) {
    throw new Error('Runway upload response missing uploadUrl or runwayUri')
  }

  // 4. Upload normalized JPEG buffer to S3 presigned URL
  const formData = new FormData()
  for (const [k, v] of Object.entries(slot.fields || {})) {
    formData.append(k, v)
  }
  const fileBlob = new Blob([normalizedBuf], { type: 'image/jpeg' })
  formData.append('file', fileBlob, filename || 'reference.jpg')

  const s3Res = await fetch(slot.uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!s3Res.ok) {
    const s3Err = await s3Res.text().catch(() => '')
    throw new Error(`Runway S3 upload failed (${s3Res.status}): ${s3Err}`)
  }

  // 5. Diagnostic logging — strictly only the 5 required fields
  const diagnostic = {
    originalSourceType: detectedFormat,
    normalizedMime: 'image/jpeg',
    dimensions: `${info.width}x${info.height}`,
    byteSize: normalizedBuf.length,
    isRunwayUri: slot.runwayUri.startsWith('runway://'),
  }
  console.log('[Runway Asset Normalization]', diagnostic)

  // 6. Cache result
  serverAssetCache.set(cacheKey, {
    uri: slot.runwayUri,
    meta: diagnostic,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return { uri: slot.runwayUri, meta: diagnostic }
}
