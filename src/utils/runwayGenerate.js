// Runway ML API client for AI Influencer Studio

const RUNWAY_KEY = 'runway_api_key'
const RUNWAY_DEFAULT_MODEL = 'runway_default_model'
const RUNWAY_DEFAULT_IMAGE_MODEL = 'runway_default_image_model'
const VIDEO_PROVIDER_KEY = 'video_active_provider'
const IMAGE_PROVIDER_KEY = 'image_active_provider'
const PENDING_RUNWAY_KEY = 'runway_pending_videos'
const PENDING_RUNWAY_IMAGE_KEY = 'runway_pending_images'

export const RUNWAY_MODELS = [
  { id: 'gen4_turbo', name: 'Gen-4 Turbo', badge: 'Fast', desc: 'Runway Gen-4 Turbo — fast generation, high consistency' },
  { id: 'gen4.5', name: 'Gen-4.5', badge: 'Ultra', desc: 'Runway Gen-4.5 — highest cinematic detail & lighting' },
  { id: 'seedance2_5', name: 'Seedance 2.5', badge: 'UGC / Multi-Ref', desc: 'Seedance 2.5 — supports multi-image conditioning (Character + Product)' },
]

export const RUNWAY_IMAGE_MODELS = [
  { id: 'gen4_image', name: 'Gen-4 Image', badge: 'Best Quality', desc: 'Runway Gen-4 Image — highest fidelity, multi-reference support' },
  { id: 'gen4_image_turbo', name: 'Gen-4 Image Turbo', badge: 'Fast', desc: 'Runway Gen-4 Image Turbo — faster generation, single reference' },
]

export function getRunwayKey() {
  try { return localStorage.getItem(RUNWAY_KEY) || '' } catch { return '' }
}

export function setRunwayKey(k) {
  try {
    if (k) localStorage.setItem(RUNWAY_KEY, k.trim())
    else localStorage.removeItem(RUNWAY_KEY)
  } catch {}
}

export function isRunwayConnected() {
  return Boolean(getRunwayKey().trim())
}

export function getRunwayDefaultModel() {
  try { return localStorage.getItem(RUNWAY_DEFAULT_MODEL) || 'gen4_turbo' } catch { return 'gen4_turbo' }
}

export function setRunwayDefaultModel(m) {
  try { localStorage.setItem(RUNWAY_DEFAULT_MODEL, m) } catch {}
}

export function getRunwayDefaultImageModel() {
  try { return localStorage.getItem(RUNWAY_DEFAULT_IMAGE_MODEL) || 'gen4_image' } catch { return 'gen4_image' }
}

export function setRunwayDefaultImageModel(m) {
  try { localStorage.setItem(RUNWAY_DEFAULT_IMAGE_MODEL, m) } catch {}
}

export function getActiveVideoProvider() {
  try {
    const saved = localStorage.getItem(VIDEO_PROVIDER_KEY)
    if (saved) return saved
    return isRunwayConnected() ? 'runway' : 'higgsfield'
  } catch {
    return 'higgsfield'
  }
}

export function setActiveVideoProvider(p) {
  try { localStorage.setItem(VIDEO_PROVIDER_KEY, p) } catch {}
}

export function getActiveImageProvider() {
  try {
    const saved = localStorage.getItem(IMAGE_PROVIDER_KEY)
    if (saved) return saved
    return 'higgsfield'
  } catch {
    return 'higgsfield'
  }
}

export function setActiveImageProvider(p) {
  try { localStorage.setItem(IMAGE_PROVIDER_KEY, p) } catch {}
}

export function savePendingRunwayImage(key, taskId) {
  try { localStorage.setItem(`${PENDING_RUNWAY_IMAGE_KEY}_${key}`, JSON.stringify({ taskId, startedAt: Date.now() })) } catch {}
}

export function getPendingRunwayImage(key) {
  try {
    const raw = localStorage.getItem(`${PENDING_RUNWAY_IMAGE_KEY}_${key}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPendingRunwayImage(key) {
  try { localStorage.removeItem(`${PENDING_RUNWAY_IMAGE_KEY}_${key}`) } catch {}
}

const RUNWAY_NORMALIZE_ASSETS_KEY = 'runway_normalize_assets'

export function isRunwayAssetNormalizationEnabled() {
  try {
    const saved = localStorage.getItem(RUNWAY_NORMALIZE_ASSETS_KEY)
    return saved === null ? true : saved === 'true'
  } catch {
    return true
  }
}

export function setRunwayAssetNormalizationEnabled(enabled) {
  try {
    localStorage.setItem(RUNWAY_NORMALIZE_ASSETS_KEY, String(Boolean(enabled)))
  } catch {}
}

// Client-side cache for ephemeral Runway URIs: hash -> { uri, meta, expiresAt }
const clientAssetMemoryCache = new Map()

function getClientAssetStorageKey(url) {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0
  }
  return `runway_asset_cache_${Math.abs(hash).toString(36)}_${url.slice(-24).replace(/[^a-zA-Z0-9]/g, '')}`
}

export function getClientCachedRunwayAsset(url) {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('runway://')) {
    return {
      uri: url,
      meta: { originalSourceType: 'runway', normalizedMime: 'image/jpeg', dimensions: 'native', byteSize: 0, isRunwayUri: true },
      expiresAt: Date.now() + 20 * 60 * 60 * 1000,
    }
  }

  const mem = clientAssetMemoryCache.get(url)
  if (mem && mem.expiresAt > Date.now()) {
    return mem
  }

  try {
    const key = getClientAssetStorageKey(url)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data && data.uri && data.expiresAt > Date.now()) {
      clientAssetMemoryCache.set(url, data)
      return data
    }
  } catch {}
  return null
}

export function setClientCachedRunwayAsset(url, assetData) {
  if (!url || !assetData || !assetData.uri) return
  clientAssetMemoryCache.set(url, assetData)
  try {
    const key = getClientAssetStorageKey(url)
    localStorage.setItem(key, JSON.stringify(assetData))
  } catch {}
}

/**
 * Normalizes a reference image (RGB, stripped metadata, max 1400px, JPEG 85)
 * and uploads via Runway's official ephemeral uploads API.
 * Returns the runway://... URI.
 */
export async function normalizeAndUploadRunwayAsset(url, apiKey) {
  if (!url || typeof url !== 'string') return url
  if (url.startsWith('runway://')) return url

  // 1. Check client cache first
  const cached = getClientCachedRunwayAsset(url)
  if (cached) {
    console.log('[Runway Asset Normalization (Cached)]', {
      originalSourceType: cached.meta.originalSourceType,
      normalizedMime: cached.meta.normalizedMime,
      dimensions: cached.meta.dimensions,
      byteSize: cached.meta.byteSize,
      isRunwayUri: Boolean(cached.uri && cached.uri.startsWith('runway://')),
    })
    return cached.uri
  }

  // 2. Call server-side normalization and ephemeral upload
  const res = await fetch('/api/runway/upload-asset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-runway-key': apiKey,
    },
    body: JSON.stringify({ url }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `Runway asset upload failed with status ${res.status}`)
  }

  const data = await res.json()
  if (!data.uri || !data.uri.startsWith('runway://')) {
    throw new Error('Runway upload did not return a valid runway:// URI')
  }

  const meta = {
    originalSourceType: data.meta?.originalSourceType || 'unknown',
    normalizedMime: data.meta?.normalizedMime || 'image/jpeg',
    dimensions: data.meta?.dimensions || 'unknown',
    byteSize: Number(data.meta?.byteSize || 0),
    isRunwayUri: data.uri.startsWith('runway://'),
  }
  console.log('[Runway Asset Normalization]', meta)

  setClientCachedRunwayAsset(url, {
    uri: data.uri,
    meta,
    expiresAt: Date.now() + 20 * 60 * 60 * 1000,
  })

  return data.uri
}

/**
 * Model-aware reference resolution:
 * - Start Frame -> Seedance / Gen-4 image-to-video (single keyframe).
 * - Character / Product / Wardrobe / Location without Start Frame -> Seedance text-to-video with references.
 * - Gen-4.5 / Gen-4 Turbo -> image-to-video with single primary frame.
 */
export function resolveModelReferences(model, references = {}) {
  const {
    startFrame = null,
    identity = null,
    product = [],
    wardrobe = null,
    location = null,
  } = references

  const productList = Array.isArray(product) ? product.filter(Boolean) : (product ? [product] : [])

  const selectedRoles = {
    startFrame: Boolean(startFrame),
    identity: Boolean(identity),
    product: productList.length > 0,
    productCount: productList.length,
    wardrobe: Boolean(wardrobe),
    location: Boolean(location),
  }

  if (model === 'seedance2_5') {
    // 1. If startFrame is provided: Image-to-Video Keyframe mode
    if (startFrame) {
      return {
        model,
        mode: 'start-frame',
        endpoint: '/api/runway/image_to_video',
        startFrameUri: startFrame,
        referencesList: [],
        consumedRoles: ['startFrame'],
        omittedRoles: [
          ...(identity ? ['identity'] : []),
          ...(productList.length ? ['product'] : []),
          ...(wardrobe ? ['wardrobe'] : []),
          ...(location ? ['location'] : []),
        ],
        selectedRoles,
        summary: 'Seedance 2.5 Start Frame (Image-to-Video): Starts from your exact Start Frame. Product & wardrobe guided by prompt.',
      }
    }

    // 2. Multi-Reference Mode: Text-to-Video with Image References
    const items = []
    const consumedRoles = []

    if (identity) {
      items.push({ uri: identity, role: 'identity' })
      consumedRoles.push('identity')
    }
    productList.forEach((uri, idx) => {
      items.push({ uri, role: `product${idx + 1}` })
    })
    if (productList.length) {
      consumedRoles.push(`product (${productList.length})`)
    }
    if (wardrobe) {
      items.push({ uri: wardrobe, role: 'wardrobe' })
      consumedRoles.push('wardrobe')
    }
    if (location) {
      items.push({ uri: location, role: 'location' })
      consumedRoles.push('location')
    }

    return {
      model,
      mode: items.length > 0 ? 'text-to-video-with-references' : 'text-only',
      endpoint: '/api/runway/text_to_video',
      startFrameUri: null,
      referencesList: items,
      consumedRoles,
      omittedRoles: [],
      selectedRoles,
      summary: items.length > 1
        ? `Seedance 2.5 Multi-Reference (Text-to-Video): ${items.length} visual references (${consumedRoles.join(', ')}) sent to Runway.`
        : (items.length === 1 ? `Seedance 2.5 Single Reference: ${consumedRoles[0]} sent to Runway.` : 'Text-to-video without image references.'),
    }
  }

  // Gen-4.5 and Gen-4 Turbo: Single-image models (Image-to-Video)
  const primaryUri = startFrame || identity || (productList[0] || null)
  let consumedRole = null
  if (startFrame) consumedRole = 'startFrame'
  else if (identity) consumedRole = 'identity'
  else if (productList.length) consumedRole = 'product'

  const omittedRoles = []
  if (startFrame && identity) omittedRoles.push('identity')
  if (productList.length && consumedRole !== 'product') omittedRoles.push('product')
  if (wardrobe) omittedRoles.push('wardrobe')
  if (location) omittedRoles.push('location')

  const modelName = model === 'gen4.5' ? 'Gen-4.5' : 'Gen-4 Turbo'
  return {
    model,
    mode: primaryUri ? 'single-frame' : 'text-only',
    endpoint: primaryUri ? '/api/runway/image_to_video' : '/api/runway/text_to_video',
    startFrameUri: primaryUri,
    referencesList: [],
    consumedRoles: consumedRole ? [consumedRole] : [],
    omittedRoles,
    selectedRoles,
    summary: `${modelName} (Single-Frame): Consumes ${consumedRole || 'none'} as the visual frame. ${omittedRoles.length ? `${omittedRoles.join(', ')} preserved & guided via prompt.` : ''}`,
  }
}

// Build model-specific, strictly valid Runway API payloads and select correct endpoint
export function buildRunwayPayload({
  model = 'gen4_turbo',
  prompt = '',
  references = null,
  startFrameUri = null,
  referencesList = [],
  aspectRatio = '9:16',
  resolution = '1080p',
  duration = 5,
}) {
  const isLandscape = aspectRatio === '16:9' || aspectRatio === 'landscape'
  const isSquare = aspectRatio === '1:1' || aspectRatio === 'square'
  const safeDuration = Math.min(10, Math.max(2, Math.round(Number(duration) || 5)))

  let activeStartFrame = startFrameUri
  let activeRefsList = referencesList
  let activeEndpoint = '/api/runway/image_to_video'

  if (references) {
    const plan = resolveModelReferences(model, references)
    activeStartFrame = plan.startFrameUri
    activeRefsList = plan.referencesList
    activeEndpoint = plan.endpoint
  }

  if (model === 'seedance2_5') {
    let ratio
    if (resolution === '720p') {
      ratio = isLandscape ? '1280:720' : (isSquare ? '960:960' : '720:1280')
    } else if (resolution === '480p') {
      ratio = isLandscape ? '854:480' : (isSquare ? '640:640' : '480:854')
    } else {
      // 1080p (default)
      ratio = isLandscape ? '1920:1080' : (isSquare ? '1440:1440' : '1080:1920')
    }

    const payload = {
      model: 'seedance2_5',
      ratio,
      duration: safeDuration,
    }

    // Mode A: Start Frame -> Image-to-Video
    if (activeStartFrame) {
      payload.promptImage = activeStartFrame
      activeEndpoint = '/api/runway/image_to_video'
    }
    // Mode B: References -> Text-to-Video with image references
    else if (activeRefsList && activeRefsList.length > 0) {
      payload.references = activeRefsList.map(item => ({
        uri: typeof item === 'string' ? item : item.uri,
      }))
      activeEndpoint = '/api/runway/text_to_video'
    } else {
      activeEndpoint = '/api/runway/text_to_video'
    }

    if (prompt && prompt.trim()) {
      payload.promptText = prompt.trim().slice(0, 15000)
    }

    return { payload, endpoint: activeEndpoint }
  }

  if (model === 'gen4.5') {
    const ratio = isLandscape ? '1280:720' : (isSquare ? '960:960' : '720:1280')
    const payload = {
      model: 'gen4.5',
      ratio,
      duration: safeDuration,
      promptText: (prompt && prompt.trim()) ? prompt.trim().slice(0, 1000) : 'Cinematic influencer video',
    }
    if (activeStartFrame) {
      payload.promptImage = activeStartFrame
      activeEndpoint = '/api/runway/image_to_video'
    } else {
      activeEndpoint = '/api/runway/text_to_video'
    }
    return { payload, endpoint: activeEndpoint }
  }

  // Gen-4 Turbo
  const ratio = isLandscape ? '1280:720' : (isSquare ? '960:960' : '720:1280')
  const payload = {
    model: 'gen4_turbo',
    ratio,
    duration: safeDuration,
  }
  if (activeStartFrame) {
    payload.promptImage = activeStartFrame
    activeEndpoint = '/api/runway/image_to_video'
  } else {
    activeEndpoint = '/api/runway/image_to_video'
  }
  if (prompt && prompt.trim()) {
    payload.promptText = prompt.trim().slice(0, 1000)
  }
  return { payload, endpoint: activeEndpoint }
}

// Compress data URL if larger than ~3.8MB to comfortably fit within Runway's 5MB Data URI limit
async function ensureFitUri(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return dataUrl
  if (dataUrl.length < 3.8 * 1024 * 1024) return dataUrl

  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth || img.width
      let h = img.naturalHeight || img.height
      const maxDim = 1280
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim }
        else { w = Math.round((w * maxDim) / h); h = maxDim }
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export async function generateRunwayVideo({
  prompt,
  aspectRatio = '9:16',
  resolution = '1080p',
  duration = 5,
  references = null,
  referenceImages = [],
  startFrameUrl = null,
  model = 'gen4_turbo',
  onProgress = () => {},
  isCancelled = () => false,
  pendingKey = null,
}) {
  const apiKey = getRunwayKey()
  if (!apiKey) {
    throw new Error('Runway API key not found. Please connect your Runway API Key in Settings.')
  }

  // Synthesize explicit references if caller used legacy flat arrays
  const effectiveReferences = references || {
    startFrame: startFrameUrl || null,
    identity: referenceImages[0] || null,
    product: referenceImages.slice(1) || [],
  }

  // 1. Model-aware reference resolution
  const refPlan = resolveModelReferences(model, effectiveReferences)

  // 2. Prepare/compress images to ensure base64 data URIs fit safely
  let fittedStartFrame = null
  if (refPlan.startFrameUri) {
    fittedStartFrame = await ensureFitUri(refPlan.startFrameUri)
  }

  let fittedReferencesList = []
  if (refPlan.referencesList && refPlan.referencesList.length > 0) {
    fittedReferencesList = await Promise.all(
      refPlan.referencesList.map(async item => {
        // If Seedance and asset normalization enabled, normalize and upload via Runway ephemeral upload API
        if (model === 'seedance2_5' && isRunwayAssetNormalizationEnabled()) {
          try {
            const normalizedUri = await normalizeAndUploadRunwayAsset(item.uri, apiKey)
            return {
              ...item,
              uri: normalizedUri,
            }
          } catch (err) {
            console.error('[Runway Asset Normalization Failed]', err.message)
            return {
              ...item,
              uri: await ensureFitUri(item.uri),
            }
          }
        }
        return {
          ...item,
          uri: await ensureFitUri(item.uri),
        }
      })
    )
  }

  // 3. Build payload and endpoint
  const { payload, endpoint } = buildRunwayPayload({
    model,
    prompt,
    startFrameUri: fittedStartFrame,
    referencesList: fittedReferencesList,
    aspectRatio,
    resolution,
    duration,
  })

  onProgress(5)

  // 4. Submit task
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-runway-key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let errText = ''
    try {
      const errJson = await res.json()
      errText = errJson?.error?.message || errJson?.error || errJson?.message || JSON.stringify(errJson)
    } catch {
      errText = await res.text()
    }
    throw new Error(`Runway API error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const taskId = data.id
  if (!taskId) {
    throw new Error('No task ID returned from Runway API')
  }

  onProgress(15)

  // Save pending state
  if (pendingKey) {
    try {
      localStorage.setItem(`${PENDING_RUNWAY_KEY}_${pendingKey}`, JSON.stringify({ taskId, startedAt: Date.now() }))
    } catch {}
  }

  // 5. Poll task status
  const maxWaitMs = 10 * 60 * 1000 // 10 minutes max
  const startTime = Date.now()
  let lastProgress = 15

  try {
    while (Date.now() - startTime < maxWaitMs) {
      if (isCancelled()) {
        fetch(`/api/runway/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'x-runway-key': apiKey },
        }).catch(() => {})
        throw new Error('Generation cancelled')
      }

      await new Promise(r => setTimeout(r, 2500))

      const pollRes = await fetch(`/api/runway/tasks/${taskId}`, {
        headers: { 'x-runway-key': apiKey },
      })

      if (!pollRes.ok) {
        continue
      }

      const task = await pollRes.json()
      const status = (task.status || '').toUpperCase()

      if (status === 'SUCCEEDED') {
        onProgress(100)
        const urls = Array.isArray(task.output) ? task.output : (task.output ? [task.output] : [])
        if (pendingKey) {
          try { localStorage.removeItem(`${PENDING_RUNWAY_KEY}_${pendingKey}`) } catch {}
        }
        return { urls, shareUrls: urls, taskId }
      }

      if (status === 'FAILED') {
        const parts = []
        if (task.failureCode) parts.push(`[${task.failureCode}]`)
        if (task.failure) parts.push(task.failure)
        const msg = parts.join(' ') || 'Generation failed on Runway'
        throw new Error(`Runway task failed: ${msg}`)
      }

      if (status === 'CANCELLED') {
        throw new Error('Runway task was cancelled')
      }

      if (status === 'RUNNING') {
        const p = typeof task.progress === 'number'
          ? Math.round(task.progress * 100)
          : Math.min(95, lastProgress + 4)
        lastProgress = Math.max(lastProgress, p)
        onProgress(Math.min(98, Math.max(20, lastProgress)))
      } else if (status === 'THROTTLED') {
        onProgress(18)
      } else {
        lastProgress = Math.min(30, lastProgress + 2)
        onProgress(lastProgress)
      }
    }

    throw new Error('Runway generation timed out after 10 minutes')
  } finally {
    if (pendingKey) {
      try { localStorage.removeItem(`${PENDING_RUNWAY_KEY}_${pendingKey}`) } catch {}
    }
  }
}

// Build a Gen-4 Image payload for /api/runway/text_to_image
function buildRunwayImagePayload({ model = 'gen4_image', prompt = '', referencesList = [], aspectRatio = '9:16' }) {
  const isLandscape = aspectRatio === '16:9' || aspectRatio === 'landscape'
  const isSquare = aspectRatio === '1:1' || aspectRatio === 'square'
  const ratio = isLandscape ? '1280:720' : (isSquare ? '960:960' : '720:1280')

  const payload = {
    model,
    ratio,
    promptText: (prompt && prompt.trim()) ? prompt.trim().slice(0, 1000) : 'Influencer photo',
  }

  if (referencesList && referencesList.length > 0) {
    payload.referenceImages = referencesList.map(item => ({
      uri: typeof item === 'string' ? item : item.uri,
      ...(item && item.role ? { tag: item.role } : {}),
    }))
  }

  return payload
}

/**
 * Generates a single image via Runway's Gen-4 Image models.
 * `references` follows the same role shape used by resolveModelReferences for video:
 * { identity, product: [...], wardrobe, location } — each present role becomes a
 * tagged reference image the prompt can address as @identity / @product1 / etc.
 * Returns Promise<string[]> — the resulting image URL(s).
 */
export async function generateRunwayImage({
  prompt,
  aspectRatio = '9:16',
  model = 'gen4_image',
  references = null,
  onProgress = () => {},
  isCancelled = () => false,
  pendingKey = null,
}) {
  const apiKey = getRunwayKey()
  if (!apiKey) {
    throw new Error('Runway API key not found. Please connect your Runway API Key in Settings.')
  }

  const items = []
  if (references) {
    const { identity = null, product = [], wardrobe = null, location = null } = references
    const productList = Array.isArray(product) ? product.filter(Boolean) : (product ? [product] : [])
    if (identity) items.push({ uri: identity, role: 'identity' })
    productList.forEach((uri, idx) => items.push({ uri, role: `product${idx + 1}` }))
    if (wardrobe) items.push({ uri: wardrobe, role: 'wardrobe' })
    if (location) items.push({ uri: location, role: 'location' })
  }

  const fittedItems = await Promise.all(items.map(async item => {
    if (isRunwayAssetNormalizationEnabled()) {
      try {
        const uri = await normalizeAndUploadRunwayAsset(item.uri, apiKey)
        return { ...item, uri }
      } catch (err) {
        console.error('[Runway Asset Normalization Failed]', err.message)
        return { ...item, uri: await ensureFitUri(item.uri) }
      }
    }
    return { ...item, uri: await ensureFitUri(item.uri) }
  }))

  const payload = buildRunwayImagePayload({ model, prompt, referencesList: fittedItems, aspectRatio })

  onProgress(5)

  const res = await fetch('/api/runway/text_to_image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-runway-key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let errText = ''
    try {
      const errJson = await res.json()
      errText = errJson?.error?.message || errJson?.error || errJson?.message || JSON.stringify(errJson)
    } catch {
      errText = await res.text()
    }
    throw new Error(`Runway API error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const taskId = data.id
  if (!taskId) {
    throw new Error('No task ID returned from Runway API')
  }

  onProgress(15)

  if (pendingKey) savePendingRunwayImage(pendingKey, taskId)

  const maxWaitMs = 3 * 60 * 1000 // images are much faster than video
  const startTime = Date.now()
  let lastProgress = 15

  try {
    while (Date.now() - startTime < maxWaitMs) {
      if (isCancelled()) {
        fetch(`/api/runway/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'x-runway-key': apiKey },
        }).catch(() => {})
        throw new Error('Generation cancelled')
      }

      await new Promise(r => setTimeout(r, 2000))

      const pollRes = await fetch(`/api/runway/tasks/${taskId}`, {
        headers: { 'x-runway-key': apiKey },
      })

      if (!pollRes.ok) continue

      const task = await pollRes.json()
      const status = (task.status || '').toUpperCase()

      if (status === 'SUCCEEDED') {
        onProgress(100)
        const urls = Array.isArray(task.output) ? task.output : (task.output ? [task.output] : [])
        return urls
      }

      if (status === 'FAILED') {
        const parts = []
        if (task.failureCode) parts.push(`[${task.failureCode}]`)
        if (task.failure) parts.push(task.failure)
        throw new Error(`Runway task failed: ${parts.join(' ') || 'Generation failed on Runway'}`)
      }

      if (status === 'CANCELLED') {
        throw new Error('Runway task was cancelled')
      }

      if (status === 'RUNNING') {
        const p = typeof task.progress === 'number'
          ? Math.round(task.progress * 100)
          : Math.min(95, lastProgress + 8)
        lastProgress = Math.max(lastProgress, p)
        onProgress(Math.min(98, Math.max(20, lastProgress)))
      } else if (status === 'THROTTLED') {
        onProgress(18)
      } else {
        lastProgress = Math.min(30, lastProgress + 2)
        onProgress(lastProgress)
      }
    }

    throw new Error('Runway image generation timed out after 3 minutes')
  } finally {
    if (pendingKey) clearPendingRunwayImage(pendingKey)
  }
}
