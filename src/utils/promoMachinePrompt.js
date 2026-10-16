// ─────────────────────────────────────────────
// promoMachinePrompt.js
//
// Standalone, pure-function port of the Seedance master-prompt builder
// found in src/pages/Influencers.jsx (buildPrompt / generate / regenerateSlot,
// and the Content Studio helpers around CS_ENV_PRESETS / annotateDialogue).
//
// No React. No network calls. No Higgsfield. This module only builds the
// prompt STRING plus metadata describing what reference images go where —
// it never calls generateVideo() or any generation API.
//
// Generalized from the "influencer" character flow to work for ANY
// product/business: `refs` takes { identity, wardrobe, closeup1, closeup2,
// product1, product2 } image URLs (or data URLs) instead of reading off an
// Influencer record from the store.
// ─────────────────────────────────────────────

// ── Environment presets (CS_ENVIRONMENTS / CS_ENV_PRESETS) ──
export const ENV_PRESETS = [
  { key: 'Bedroom',      label: 'In a bedroom',  preset: 'in the bedroom' },
  { key: 'Bathroom',     label: 'In a bathroom', preset: 'in the bathroom' },
  { key: 'Kitchen',      label: 'In the kitchen', preset: 'in the kitchen' },
  { key: 'Coffee Shop',  label: 'Coffee shop',   preset: 'in a coffee shop' },
  { key: 'Mall / Store', label: 'At the mall',   preset: 'in a mall or store' },
  { key: 'Street',       label: 'On the street', preset: 'on the street outside' },
  { key: 'Gym',          label: 'At the gym',    preset: 'in the gym' },
  { key: 'Studio',       label: 'In a studio',   preset: 'in a studio' },
]
const ENV_PRESET_MAP = Object.fromEntries(ENV_PRESETS.map(e => [e.key, e.preset]))

// ── Ambient sound (AMBIENT_SOUND / inferAmbientSound) ──
const AMBIENT_SOUND = {
  'Bedroom':      'Quiet room tone — soft, near-silent background.',
  'Bathroom':     'Subtle bathroom reverb — clean, minimal background.',
  'Kitchen':      'Light kitchen ambience — faint appliance hum, natural room tone.',
  'Coffee Shop':  'Ambient coffee shop — low chatter, espresso machine, soft background bustle.',
  'Mall / Store': 'Ambient mall — light crowd murmur, distant music.',
  'Street':       'Outdoor city ambience — light traffic, natural wind, distant urban activity.',
  'Gym':          'Ambient gym — distant weights, low activity, faint background music.',
  'Studio':       'Clean studio silence — minimal room tone, no background noise.',
}

export function inferAmbientSound(envKey, environment) {
  if (envKey && AMBIENT_SOUND[envKey]) return AMBIENT_SOUND[envKey]
  const e = (environment || envKey || '').toLowerCase()
  if (/restaurant|dining|bistro|brasserie|diner/.test(e)) return 'Ambient restaurant — low dining chatter, cutlery, warm bustle.'
  if (/beach|ocean|sea|shore|surf/.test(e)) return 'Ambient beach — waves, light breeze, distant seagulls.'
  if (/park|garden|nature|forest|woods/.test(e)) return 'Outdoor ambience — birds, light breeze, natural sounds.'
  if (/office|work|corporate|coworking/.test(e)) return 'Quiet office ambience — distant keyboard, low HVAC hum.'
  if (/car|vehicle|driving|road/.test(e)) return 'Ambient car interior — engine hum, road noise.'
  if (/bar|club|lounge|nightclub/.test(e)) return 'Ambient nightlife — low crowd murmur, distant music, gentle bass.'
  if (/pool|spa|resort|hotel/.test(e)) return 'Ambient resort — light water, gentle breeze, relaxed atmosphere.'
  if (/market|bazaar|store|shop/.test(e)) return 'Ambient market — light crowd, distant chatter.'
  if (/rooftop|terrace|balcony/.test(e)) return 'Outdoor rooftop ambience — light wind, distant city sounds.'
  if (/airport|station|transit/.test(e)) return 'Ambient transit sounds — light crowd, distant announcements.'
  return 'Natural ambient sound — location-appropriate background audio.'
}

// ── Cameras / vibes (CS_CAMERAS / CS_VIBES) ──
export const CAMERAS = ['Handheld', 'Tripod', 'Talking Head']
export const VIBES = ['Natural', 'Energetic', 'Luxury', 'Playful', 'Tutorial', 'Dramatic', 'Cozy', 'Confident']

// ── Voice presets (VOICE_PRESETS) ──
export const VOICE_PRESETS = {
  female: [
    { id: 'f-21-american-bright', label: '21-year-old American', sub: 'Bright · fast · TikTok-native', voice: '21-year-old American woman accent, bright and energetic, fast-paced and upbeat.' },
    { id: 'f-28-american-warm',   label: '28-year-old American', sub: 'Warm · confident · grounded',   voice: '28-year-old American woman accent, warm and confident, clear and grounded.' },
    { id: 'f-35-american-calm',   label: '35-year-old American', sub: 'Calm · measured · trustworthy', voice: '35-year-old American woman accent, calm and measured, slow and soothing.' },
    { id: 'f-british-polished',   label: 'British — polished',   sub: 'Refined · elegant · clear',     voice: 'Polished British woman accent, refined and elegant, clear and measured.' },
    { id: 'f-british-playful',    label: 'British — playful',    sub: 'Bright · warm · charming',      voice: 'Playful British woman accent, bright and warm, light and charming.' },
    { id: 'f-deep-japanese',      label: 'Japanese — soft',      sub: 'Soft · gentle · precise',       voice: 'Soft Japanese woman accent, gentle and precise, calm and measured.' },
  ],
  male: [
    { id: 'm-22-american-energy', label: '22-year-old American', sub: 'Energetic · direct · natural',      voice: '22-year-old American man accent, energetic and direct, upbeat and natural.' },
    { id: 'm-30-american-deep',   label: '30-year-old American', sub: 'Deep · confident · authoritative',  voice: '30-year-old American man accent, deep and confident, authoritative and measured.' },
    { id: 'm-38-american-warm',   label: '38-year-old American', sub: 'Warm · relaxed · approachable',     voice: '38-year-old American man accent, warm and relaxed, approachable and conversational.' },
    { id: 'm-british-sharp',      label: 'British — sharp',      sub: 'Refined · precise · authoritative', voice: 'Sharp British man accent, refined and precise, clear and authoritative.' },
    { id: 'm-british-story',      label: 'British — storyteller', sub: 'Warm · engaging · unhurried',      voice: 'Warm British man storytelling accent, engaging and unhurried, naturally charismatic.' },
  ],
}
const ALL_VOICE_PRESETS = [...VOICE_PRESETS.female, ...VOICE_PRESETS.male]

// ── Quick-start templates (VIDEO_TEMPLATES) ──
export const TEMPLATES = [
  {
    id: 'talking-head', label: 'Talking Head', icon: '🎤',
    sub: 'Direct to camera, personal & engaging',
    dialogue: "I need to tell you about something that completely changed my routine.",
    envKey: 'Bedroom', environment: '',
    camera: 'Handheld', vibe: 'Natural', duration: 8, shotMode: 'oner',
  },
  {
    id: 'product-review', label: 'Product Review', icon: '⭐',
    sub: 'Hold, show, and talk about a product',
    dialogue: "Okay so I've been using this for two weeks and here's my honest take.",
    envKey: 'Studio', environment: '',
    camera: 'Handheld', vibe: 'Tutorial', duration: 12, shotMode: 'oner',
  },
  {
    id: 'grwm', label: 'GRWM', icon: '✨',
    sub: 'Get Ready With Me — casual beauty content',
    dialogue: "Get ready with me for tonight — I have a whole thing planned.",
    envKey: 'Bathroom', environment: '',
    camera: 'Handheld', vibe: 'Playful', duration: 10, shotMode: 'oner',
  },
  {
    id: 'brand-collab', label: 'Brand Collab', icon: '🤝',
    sub: 'Polished partnership announcement',
    dialogue: "I partnered with a brand that actually aligns with how I live.",
    envKey: 'Street', environment: '',
    camera: 'Handheld', vibe: 'Confident', duration: 12, shotMode: 'oner',
  },
]

export const DIALOGUE_STARTERS = [
  "I need to tell you about something—",
  "Okay so I've been obsessed with this—",
  "This is my honest review:",
  "Can we talk about this for a second?",
  "I wasn't going to post this but—",
  "Three things I noticed after one week:",
]

// ── Style / mood / color maps (adapted from buildPrompt's internal consts) ──
const STYLE_MAP = {
  'Handheld':     'Self-filmed handheld. @image_1 holds the camera at arm\'s length, 24mm, walk-pace bob and drift throughout. Never fully static. NO shallow DOF, NO bokeh, NO blur, natural front-cam color.',
  'Tripod':       'Locked tripod, 28mm. Static frame, nothing moves except the subject. Everything in focus front to back. NO shallow DOF, NO bokeh, NO blur, clean natural color.',
  'Talking Head': 'Locked tripod, 50mm portrait lens. Medium shot — framed from mid-chest up. Subject is seated, hands visible resting on desk surface in foreground. Static frame, nothing moves except the subject. Even studio lighting, soft and controlled. Everything in focus. NO shallow DOF, NO bokeh, NO blur, clean neutral color.',
}
const CAMERA_MOVEMENT = { 'Handheld': 'handheld moving', 'Tripod': 'locked', 'Talking Head': 'locked' }
const MOOD_MAP = {
  'Natural':   "Delivery is unhurried and conversational — pauses land where they would in real speech, never performed. Micro-expressions are small and honest: a slight mouth pull before a punchline, a brief brow soften on the reveal. Gestures are loose and incidental, not choreographed. Eye contact with the camera is easy, breaks naturally, comes back. Energy stays flat and warm across the whole clip.",
  'Energetic': "Delivery is fast and forward — {she} pushes through lines with minimal pause, pace never drops. Eyebrows lift on emphasis words. Gestures are sharp and frequent: quick hand flicks, small head tilts that land on key beats. Body is slightly forward the whole time. Expression resets fast between lines — no lingering. Clip ends on full energy, nothing winds down.",
  'Luxury':    "Delivery is slow and deliberate — every word has weight, pauses are long and intentional. Micro-expressions are subtle: a slow smirk rather than a smile, heavy-lidded confidence, no wide eyes. Gestures are minimal and controlled — small wrist movements, nothing above the shoulder. {She} never rushes. Eye contact is held longer than comfortable, then released slowly.",
  'Playful':   "Delivery has rhythm and bounce — slight sing-song cadence, small upticks at the ends of phrases. Quick genuine smiles that reach the eyes, eyebrow raises on key words. Light shoulder movement on emphasis. Pauses are short and teasing, like {she}'s about to say something and makes you wait one beat. Gestures are small and spirited — pointing, light wrist flick.",
  'Tutorial':  "Delivery is clear and even-paced — deliberate without being slow, every word lands cleanly. Direct sustained eye contact with the camera, nods on key points. Gestures are demonstrative: {she} points at or tilts the product on relevant beats, uses open-palm gestures when explaining. Expression stays calm and assured throughout. No uptalk — every sentence lands flat and final.",
  'Dramatic':  "Delivery is slow-building — early lines are quiet and measured, pace tightens toward the end. Strategic pauses that hold one beat longer than expected. Eyes stay on camera longer than normal, expression shifts are controlled and deliberate. Gestures are restrained — hands stay low, movement is minimal until the payoff line. The reveal lands with full stillness.",
  'Cozy':      "Delivery is soft and low-energy — {she} sounds like {she}'s talking to one person, not a camera. Slight smile throughout, never fades completely. Minimal gestures, hands stay relaxed. Pauses feel comfortable, not empty. Eye contact is warm and personal. Pace is slow enough that every word registers. Expression stays gentle from first frame to last.",
  'Confident': "Delivery is even and controlled — no uptalk, no filler energy, every line lands flat and sure. Holds eye contact with the camera without excess blinking. Gestures are purposeful and limited — one clean move per beat, nothing nervous or decorative. Expression is neutral-warm: not performing happiness, just completely at ease. Pace stays consistent, never rushes the reveal.",
}
const COLOR_MAP = {
  'Bedroom':      'Warm soft palette, amber tones, clean skin highlight.',
  'Bathroom':     'Neutral clean tones, slight coolness, face is brightest element.',
  'Kitchen':      'Fresh neutral palette, clean whites, warm skin.',
  'Coffee Shop':  'Warm caramel tones, soft and inviting.',
  'Mall / Store': 'Bright clean palette, commercial whites, product pops.',
  'Street':       'Golden-warm with cool sky fill, high-contrast.',
  'Gym':          'High contrast, cool-neutral, energetic.',
  'Studio':       'Clean neutral, controlled, product-forward.',
}

// ─────────────────────────────────────────────
// parseAdditionalNotes — same behavior as Influencers.jsx
// ─────────────────────────────────────────────
export function parseAdditionalNotes(notes, durationSecs) {
  if (!notes || !notes.trim()) return { actionBeats: [], directionNotes: '' }

  const sentences = notes.trim()
    .split(/(?<=[.!?])\s+|[\n]+/)
    .map(s => s.trim())
    .filter(Boolean)

  const actionBeats = []
  const directionLines = []

  const ACTION_VERBS = /\b(pick|picks up|hold|holds|turn|turns|spin|spins|lean|leans|look|looks at|walk|walks|sit|sits|stand|stands|laugh|laughs|smile|smiles|nod|nods|wave|waves|point|points|reach|reaches|touch|touches|grab|grabs|show|shows|open|opens|close|closes|tilt|tilts|adjust|adjusts|pull|pulls|lift|lifts|flip|flips|drop|drops|step|steps|crouch|crouches|glance|glances|wink|winks|pause|pauses|freeze|freezes|stop|stops)\b/i

  for (const s of sentences) {
    const isActionBeat = ACTION_VERBS.test(s) || /\b(she|he|they)\s+\w+/i.test(s) || /\bpause\b/i.test(s)

    if (isActionBeat) {
      let fraction = 0.5
      let ts = `0:${String(Math.round(durationSecs * 0.5)).padStart(2, '0')}`

      if (/\bat (the )?start\b|from the start|at the beginning|^first\b/i.test(s)) {
        fraction = 0; ts = '0:01'
      } else if (/\bat (the )?end\b|last|final|before (it )?cuts/i.test(s)) {
        fraction = 1; ts = `0:${String(Math.max(durationSecs - 2, 1)).padStart(2, '0')}`
      } else {
        const m = s.match(/at\s+(\d+)\s*s(?:ec(?:ond)?s?)?/i)
        if (m) {
          const sec = parseInt(m[1])
          fraction = Math.min(sec / durationSecs, 1)
          ts = `0:${String(sec).padStart(2, '0')}`
        }
      }

      let text = s
        .replace(/at (the )?(start|end|beginning)\b[,]?/gi, '')
        .replace(/from the start\b[,]?/gi, '')
        .replace(/at \d+\s*s(ec(ond)?s?)?\b[,]?/gi, '')
        .replace(/^(make sure|ensure|have her|have him|i want|please|note[:]?)\s+/i, '')
        .trim()
        .replace(/[.!?]+$/, '')

      if (!/^(she|he|they)\b/i.test(text)) text = `She ${text.charAt(0).toLowerCase()}${text.slice(1)}`
      text = text.charAt(0).toUpperCase() + text.slice(1)

      actionBeats.push({ text, timestamp: ts, fraction, fired: false })
    } else {
      directionLines.push(s.replace(/[.!?]+$/, '').trim())
    }
  }

  actionBeats.sort((a, b) => a.fraction - b.fraction)

  return { actionBeats, directionNotes: directionLines.join('. ').trim() }
}

// ─────────────────────────────────────────────
// annotateDialogue — same behavior as Influencers.jsx
// ─────────────────────────────────────────────
export function annotateDialogue(rawText, productTag, durationSecs, isHandheld = false, wearMode = false, actionBeats = [], she = 'she', her = 'her', his = 'her') {
  if (!rawText || !rawText.trim()) return ''

  const sentences = rawText.trim()
    .split(/(?<=[.!?])\s+/)
    .flatMap(s => s.split(/,\s+(?=(?:but|however|though|yet)\s)/i))
    .map(s => s.trim())
    .filter(Boolean)

  let microLeft = durationSecs <= 6 ? 1 : 2
  const useMicro = expr => { if (!microLeft) return ''; microLeft--; return expr }

  const prod = productTag || null
  const out = []

  const She = she.charAt(0).toUpperCase() + she.slice(1)
  const Her = her.charAt(0).toUpperCase() + her.slice(1)
  const WORN_GESTURES = prod ? [
    `${She} touches ${prod} briefly — natural, not staged.`,
    `${Her} hand goes to ${prod} for a beat, then back to natural position.`,
    `${She} glances toward ${prod}, then back to lens — draws attention to it without words.`,
    `${She} adjusts ${prod} slightly — natural reflex, eyes stay on camera.`,
    `${She} angles ${his} body so ${prod} is clearly visible, then settles back.`,
  ] : []
  let wornGestureIdx = 0
  let wornGestureCounter = 0
  let wornGesturesUsed = 0
  const wornGestureMax = durationSecs <= 6 ? 1 : 2
  function maybeWornGesture() {
    if (!wearMode || !prod) return null
    if (wornGesturesUsed >= wornGestureMax) return null
    wornGestureCounter++
    if (wornGestureCounter % 3 !== 0) return null
    const g = WORN_GESTURES[wornGestureIdx % WORN_GESTURES.length]
    wornGestureIdx++
    wornGesturesUsed++
    return g
  }

  if (isHandheld) {
    out.push(prod
      ? wearMode
        ? `@image_1 is self-filming — arm extended toward camera, ${prod} worn. ${she.charAt(0).toUpperCase() + she.slice(1)} is already walking. Camera bobs with ${his} steps from 0:00. One breath before ${she} speaks.`
        : `@image_1 is self-filming — arm extended toward camera, ${prod} in the other hand. ${she.charAt(0).toUpperCase() + she.slice(1)} is already walking. Camera bobs with ${his} steps from 0:00. One breath before ${she} speaks.`
      : `@image_1 is self-filming — arm extended toward camera, already walking. Camera bobs with ${his} steps from 0:00. One breath before ${she} speaks.`
    )
  } else {
    out.push(prod
      ? wearMode
        ? `@image_1 faces camera, ${prod} worn from 0:00. ${she.charAt(0).toUpperCase() + she.slice(1)} touches or adjusts ${prod} once early — natural reflex that draws attention to it. One breath before ${she} starts.`
        : `@image_1 faces camera, ${prod} in hand from 0:00. One breath before ${she} starts.`
      : `@image_1 faces camera. Eyes on lens. One breath.`
    )
  }

  for (const beat of actionBeats) {
    if (!beat.fired && beat.fraction === 0) {
      beat.fired = true
      out.push(`At ${beat.timestamp} — ${beat.text}.`)
    }
  }

  sentences.forEach((raw, i) => {
    const s = raw.trim()
    const l = s.toLowerCase()
    const isLast = i === sentences.length - 1
    const hasPivot = /^(but|however|though|yet)\s/i.test(l)
    const hasActually = /\bactually\b/.test(l)
    const hasEllipsis = s.includes('...')
    const endsExclaim = s.endsWith('!')
    const isCTA = isLast && /^(so if|if you|grab|go get|buy|check out|order|pick up|get yours)\b/i.test(l)
    const isNegative = /\b(not a fan|taste like|tastes like|99%|don'?t like|dislike|awful|terrible|cough syrup|worst|gross)\b/.test(l)

    if (isCTA) {
      out.push(`"${s}" Lands easy — like a tip from a friend, not a pitch.`)
      return
    }

    if (hasPivot && hasEllipsis) {
      wornGestureCounter++
      if (prod) out.push(wearMode ? `She touches ${prod} and angles so it's clearly visible to camera.` : `She tilts ${prod} toward camera.`)
      out.push(endsExclaim ? `"${s}" Energy up — genuine.` : `"${s}" [beat.]`)
      return
    }

    if (hasPivot || (hasActually && !isNegative)) {
      wornGestureCounter++
      if (prod) out.push(wearMode ? `She touches ${prod}, angles so it's visible. "${s}" [beat.]` : `She tilts ${prod} toward camera. "${s}" [beat.]`)
      else out.push(`She leans forward slightly. "${s}" [beat.]`)
      return
    }

    if (hasEllipsis) {
      const [before, after] = s.split(/\.\.\./)
      const g = maybeWornGesture()
      if (g) out.push(g)
      out.push(`"${before.trim()}..."`)
      out.push(`[micro-pause.]`)
      const afterTrimmed = after?.trim()
      if (afterTrimmed) out.push(/[!]$/.test(afterTrimmed) ? `"${afterTrimmed}" Energy up — genuine.` : `"${afterTrimmed}" [beat.]`)
      return
    }

    if (i === 0) {
      const m = useMicro(` Corners of ${his} mouth pull back — genuine, not performed.`)
      out.push(`"${s}" [beat.]${m}`)
      return
    }

    if (isNegative) {
      const m = useMicro(' Slight face — honest, not dramatic.')
      const g = maybeWornGesture()
      if (g) out.push(g)
      out.push(`"${s}"${m} [beat.]`)
      return
    }

    if (endsExclaim) {
      const g = maybeWornGesture()
      if (g) out.push(g)
      out.push(`"${s}" Energy up — genuine, not performed.`)
      return
    }

    const g = maybeWornGesture()
    if (g) out.push(g)
    out.push(`"${s}" [beat.]`)

    if (actionBeats.length) {
      const sentenceFraction = (i + 1) / sentences.length
      for (const beat of actionBeats) {
        if (!beat.fired && beat.fraction <= sentenceFraction) {
          beat.fired = true
          out.push(`At ${beat.timestamp} — ${beat.text}.`)
        }
      }
    }
  })

  for (const beat of actionBeats) {
    if (!beat.fired) {
      beat.fired = true
      out.push(`At ${beat.timestamp} — ${beat.text}.`)
    }
  }

  if (out.length && out[out.length - 1].endsWith('[beat.]')) {
    out[out.length - 1] = out[out.length - 1].slice(0, -7).trimEnd()
  }

  return out.join(' ')
}

// ─────────────────────────────────────────────
// buildMasterPrompt — generalized port of Influencers.jsx's buildPrompt().
// Works for ANY product/business, not just a saved "influencer" character:
// identity/wardrobe/closeups/product refs are passed in via `refs` instead
// of being read off a store record.
// ─────────────────────────────────────────────
export function buildMasterPrompt({
  name = 'Presenter',
  gender = 'Female',
  startFrameMode = false,
  refs = {},
  productWorn = false,
  camera = 'Handheld',
  vibe = 'Natural',
  envKey = '',
  environment = '',
  videoTimeOfDay = '',
  dialogue = '',
  additionalNotes = '',
  duration = 8,
  shotMode = 'oner',
  audioRef = false,
  voicePreset = '',
  voiceCustom = '',
} = {}) {
  const isMale = gender === 'Male'
  const she = isMale ? 'he' : 'she'
  const She = isMale ? 'He' : 'She'
  const her = isMale ? 'him' : 'her'
  const his = isMale ? 'his' : 'her'

  // ── Build ordered image tag map — same ordering rule as buildRefs()/buildPrompt():
  // identity, wardrobe, closeup1, closeup2, then product1, product2.
  // In start-frame mode: @image_1 = start frame (identity + outfit baked in), then products.
  const prodImgs = [
    refs.product1 && { role: 'product1', url: refs.product1 },
    refs.product2 && { role: 'product2', url: refs.product2 },
  ].filter(Boolean)

  const tagMap = {}
  const imageOrder = []

  if (startFrameMode) {
    if (refs.identity) {
      tagMap.identity = '@image_1'
      imageOrder.push({ role: 'identity', label: 'Start frame', tag: '@image_1', url: refs.identity })
    }
    prodImgs.forEach((prod, i) => {
      const n = imageOrder.length + 1
      const tag = `@image_${n}`
      tagMap[prod.role] = tag
      imageOrder.push({ role: prod.role, label: prod.role === 'product1' ? 'Product 1' : 'Product 2', tag, url: prod.url })
    })
  } else {
    const infImgs = [
      refs.identity && { role: 'identity', label: 'Identity', url: refs.identity },
      refs.wardrobe && { role: 'wardrobe', label: 'Wardrobe', url: refs.wardrobe },
      refs.closeup1 && { role: 'closeup1', label: 'Close-up 1', url: refs.closeup1 },
      refs.closeup2 && { role: 'closeup2', label: 'Close-up 2', url: refs.closeup2 },
    ].filter(Boolean)
    ;[...infImgs, ...prodImgs].forEach((img) => {
      const n = imageOrder.length + 1
      const tag = `@image_${n}`
      tagMap[img.role] = tag
      imageOrder.push({ role: img.role, label: img.label || (img.role === 'product1' ? 'Product 1' : 'Product 2'), tag, url: img.url })
    })
  }

  // Shot count — oner = always 1, multi = auto from duration
  const shotCount = shotMode === 'oner' ? 1 : duration <= 5 ? 1 : duration <= 8 ? 2 : duration <= 12 ? 3 : 4

  const stylePreset = STYLE_MAP[camera] || STYLE_MAP['Handheld']
  const move = CAMERA_MOVEMENT[camera] || 'locked'

  const isTalkingHead = camera === 'Talking Head'
  const isHandheld = camera === 'Handheld'
  const wearMode = !!(refs.product1 && productWorn)

  // Environment
  const todLabel = { morning: 'morning', afternoon: 'afternoon', 'golden hour': 'golden hour', night: 'night' }[videoTimeOfDay] || ''
  const todSuffix = todLabel ? `, ${todLabel}` : ''
  const envDesc = startFrameMode
    ? 'Continue from start frame — environment and lighting match @image_1 exactly throughout.'
    : `${environment || (isTalkingHead ? 'in a studio' : 'indoors')}${todSuffix}`

  // Mood arc
  const moodTemplate = vibe ? (MOOD_MAP[vibe] || vibe) : 'Delivery is genuine and present throughout. Micro-expressions are honest and small. Gestures are natural and uncontrived.'
  const moodArc = moodTemplate
    .replaceAll('{she}', she).replaceAll('{She}', She)
    .replaceAll('{her}', her).replaceAll('{his}', his)

  // Color logic
  const colorLogic = envKey ? (COLOR_MAP[envKey] || 'Clean neutral, warm skin tones.') : 'Clean neutral, warm skin tones.'

  // Dialogue
  const fullDialogue = (dialogue || '').trim()
  const prod1Tag = tagMap.product1 || null

  const { actionBeats, directionNotes } = parseAdditionalNotes(additionalNotes, duration)
  const annotatedDialogue = annotateDialogue(fullDialogue, prod1Tag, duration, isHandheld, wearMode, actionBeats, she, her, his)
  const dialogueLines = fullDialogue ? fullDialogue.split(/(?<=[.!?])\s+/).filter(s => s.trim()) : []

  // Product logic rules
  const productRules = []
  if (tagMap.product1) productRules.push(`${tagMap.product1} is always the same object — same color, label position, and size. Never substituted.${wearMode ? ` ${tagMap.product1} is WORN — never held. ${She} naturally interacts with it once or twice — a brief touch or glance — without overdoing it.` : ''}`)
  if (tagMap.product2) productRules.push(`${tagMap.product2} is always the same object — never substituted.`)

  // PRODUCT section
  const prodEntries = [
    tagMap.product1 && { tag: tagMap.product1, n: 1 },
    tagMap.product2 && { tag: tagMap.product2, n: 2 },
  ].filter(Boolean)
  let productSection = ''
  if (prodEntries.length > 0) {
    const pLines = ['PRODUCT:', '']
    prodEntries.forEach(({ tag, n }) => {
      pLines.push(`${tag} — product reference ${n}. Use as the exact source for this product's color, shape, label text and orientation, and proportions.`)
    })
    pLines.push('')
    const allProdTags = prodEntries.map(e => e.tag).join(' and ')
    pLines.push(`The product must appear identical in every frame — same label text and orientation, same colors, same proportions throughout. Never substituted, recolored, or modified. ${allProdTags} ${prodEntries.length > 1 ? 'contribute' : 'contributes'} ONLY the product — never the face, identity, wardrobe, environment, or color grade.`)
    if (wearMode) pLines.push(`Exception: ${tagMap.product1} is WORN — ${she} interacts with it naturally once or twice — a brief touch or glance — without overdoing it.`)
    productSection = pLines.join('\n')
  }

  // Build shots
  const shotDurs = shotCount === 1 ? [duration]
    : shotCount === 2 ? [2, duration - 2]
    : shotCount === 3 ? [2, Math.round((duration - 2) / 2), duration - 2 - Math.round((duration - 2) / 2)]
    : [2, 3, Math.floor((duration - 5) / 2), Math.ceil((duration - 5) / 2)]

  const framing = camera === 'Talking Head' ? 'MS' : 'MCU'
  const lens = camera === 'Handheld' ? '24mm' : camera === 'Talking Head' ? '50mm' : '28mm'

  const shots = []
  let t = 0
  for (let i = 0; i < shotCount; i++) {
    const sd = shotDurs[i]
    const te = t + sd
    const ts = `0:${String(t).padStart(2, '0')} to 0:${String(te).padStart(2, '0')}`

    if (shotMode === 'oner') {
      const startPin = startFrameMode ? `Video opens at 0:00 as @image_1 exactly. ` : ''
      const actionBody = fullDialogue
        ? annotatedDialogue
        : startFrameMode ? '' : `@image_1 faces camera. Eyes on lens at 0:00.`
      const onerTail = fullDialogue ? ` Natural conversational gestures as ${she} speaks. End cleanly with the character holding a final pose, no talking or lip movement.` : ''
      shots.push(`ACTION:\n0:00 to 0:${String(duration).padStart(2, '0')} — ${framing}, ${lens}, ${move}. One continuous take.\n\n${startPin}${actionBody}${onerTail}`.trimEnd())
    } else if (i === 0) {
      const startPin = startFrameMode ? `Video opens at 0:00 as @image_1 exactly. ` : ''
      const hookBody = dialogueLines[0] ? annotateDialogue(dialogueLines[0], prod1Tag, duration, isHandheld, wearMode, [], she, her, his) : (startFrameMode ? '' : `@image_1 faces camera. Eyes on lens at 0:00.`)
      shots.push(`SHOT 1 — ${ts}, ${framing}, ${lens}, ${move}.\n${startPin}${hookBody}`.trimEnd())
    } else {
      const line = dialogueLines[i] || ''
      const gesture = prod1Tag && i === 1
        ? (wearMode ? `${she} touches ${prod1Tag} and angles toward camera to show it` : `${she} tilts ${prod1Tag} toward camera slightly`)
        : 'one hand lifts — palm-up, natural half-shrug'
      const lineStr = line ? `"${line.trim()}" [beat — eyes stay on camera.] ` : '[holds the moment.] '
      const closingTail = fullDialogue && i === shotCount - 1 ? ' End cleanly with the character holding a final pose, no talking or lip movement.' : ''
      const voiceTail = fullDialogue ? ' Voice unhurried. Tone genuine.' : ''
      shots.push(`SHOT ${i + 1} — ${ts}, ${framing}, ${lens}, ${move}.\n@image_1 continues. ${gesture}. ${lineStr}${voiceTail}${closingTail}`.trimEnd())
    }
    t = te
  }

  // SUBJECT
  const genderHint = gender === 'Male' ? 'Male presenter. ' : gender === 'Female' ? 'Female presenter. ' : ''
  const subjectParts = startFrameMode
    ? [`${genderHint}@image_1 is the start frame — begin the video from this exact frame. Identity (face, bone structure, skin tone, hair) is locked to @image_1 throughout. Match exactly.`]
    : [`${genderHint}@image_1 is the identity — face, bone structure, skin tone, hair. Match exactly.`]
  if (!startFrameMode && tagMap.closeup1) subjectParts.push(`${tagMap.closeup1} for close-up facial detail — eye color, skin texture, pores.`)
  if (!startFrameMode && tagMap.closeup2) subjectParts.push(`${tagMap.closeup2} for feature-level accuracy — lip shape, brow arch, skin tone.`)

  // WARDROBE
  const wardrobeLine = startFrameMode
    ? `Continue outfit from @image_1 exactly — same silhouette, fabric, color, styling throughout. Zero variation.`
    : tagMap.wardrobe
      ? `Match outfit from ${tagMap.wardrobe} exactly — silhouette, fabric, color, styling, zero variation. Outfit comes from ${tagMap.wardrobe} only, not @image_1.`
      : 'Casual, stylish, consistent throughout.'

  const deliveryLine = audioRef
    ? 'Lip-sync driven by @audio_1.'
    : voiceCustom.trim()
    ? `Voice: ${voiceCustom.trim()}`
    : voicePreset
    ? `Voice: ${ALL_VOICE_PRESETS.find(v => v.id === voicePreset)?.voice || ''}`
    : fullDialogue ? 'Natural voice, genuine and present.' : `No dialogue. ${inferAmbientSound(envKey, environment)}`

  // Append unfired beats to their target shot
  const shotsWithBeats = shots.map((shot, i) => {
    let unfired
    if (shotMode === 'oner') {
      unfired = actionBeats.filter(b => !b.fired)
    } else {
      const shotStart = shotDurs.slice(0, i).reduce((a, b) => a + b, 0)
      const shotEnd = shotStart + shotDurs[i]
      unfired = actionBeats.filter(b => {
        const sec = b.fraction * duration
        return sec >= shotStart && sec < shotEnd && !b.fired
      })
    }
    unfired.forEach(b => { b.fired = true })
    if (!unfired.length) return shot
    const beatStr = shotMode === 'oner'
      ? unfired.map(b => `${b.text}.`).join(' ')
      : unfired.map(b => `At ${b.timestamp} — ${b.text}.`).join(' ')
    return shot + '\n' + beatStr
  })

  const prompt = `FORMAT: ${duration}s / ${shotCount === 1 ? '1 SHOT — continuous oner, ZERO CUTS' : `${shotCount} SHOTS`} / direct address

SUBJECT: ${subjectParts.join(' ')}

WARDROBE: ${wardrobeLine}
${productSection ? '\n' + productSection + '\n' : ''}
ENVIRONMENT: ${envDesc}

MOOD: ${moodArc}

COLOR LOGIC: ${colorLogic}

STYLE: ${stylePreset}

DELIVERY: ${deliveryLine}
${directionNotes ? `\nDIRECTION: ${directionNotes}` : ''}
LOGIC RULE: @image_1 face is fixed — same bone structure, eye color, skin tone, jawline, zero drift. Only one @image_1 in frame at any time.${shotMode === 'oner' ? ' ZERO CUTS — single uninterrupted take 0:00 to ' + duration + 's. No jump cuts, no zoom, no camera switch, no temporal skip. @image_1 moves continuously — never freezes.' : ' Wardrobe identical across all shots.'}${tagMap.wardrobe ? ` Outfit matches ${tagMap.wardrobe} throughout — do not take outfit from @image_1.` : ''}${!isHandheld ? ' No phone or smartphone visible in frame at any time — no device in hand, on any surface, or in the background.' : ''} No music. No captions. No text overlays.${productRules.length ? ' ' + productRules.join(' ') : ''}

---

${shotsWithBeats.join('\n\n')}`

  return {
    prompt,
    imageOrder,
    settings: {
      model: 'seedance_2_0',
      aspectRatio: '9:16',
      duration,
      resolution: '1080p',
    },
  }
}
