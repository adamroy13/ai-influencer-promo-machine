import { useState, useRef } from 'react'
import { compressImage } from '../utils/imageUtils'
import {
  buildMasterPrompt,
  ENV_PRESETS,
  CAMERAS,
  VIBES,
  VOICE_PRESETS,
  TEMPLATES,
} from '../utils/promoMachinePrompt'

// ─────────────────────────────────────────────
// Local helper components — match the app's inline-style + CSS-variable
// theming convention (see src/components/Nav.jsx).
// ─────────────────────────────────────────────

function Field({ label, sub, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>{sub}</div>}
      {children}
    </div>
  )
}

function ChipRow({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {options.map(o => {
        const key = typeof o === 'object' ? o.key : o
        const label = typeof o === 'object' ? o.label : o
        const on = value === key
        return (
          <button key={key} onClick={() => onChange(on ? '' : key)} style={{
            padding: '7px 14px', borderRadius: 980, fontSize: 12, fontWeight: 600,
            background: on ? 'linear-gradient(135deg,rgba(236,72,153,0.15),rgba(139,92,246,0.15))' : 'var(--bg-tertiary)',
            color: on ? '#8B5CF6' : 'var(--text-secondary)',
            border: on ? '1.5px solid rgba(139,92,246,0.4)' : '1.5px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{label}</button>
        )
      })}
    </div>
  )
}

function ImageSlot({ value, onChange, label, size = 120 }) {
  const fileRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const r = new FileReader()
    r.onload = ev => compressImage(ev.target.result).then(onChange).catch(console.error)
    r.readAsDataURL(file)
  }

  return (
    <div style={{ width: size, flexShrink: 0 }}>
      {value ? (
        <div style={{ position: 'relative' }}>
          <img src={value} style={{
            width: size, height: size, objectFit: 'contain', borderRadius: 14, display: 'block',
            border: '1.5px solid var(--border)', background: 'var(--bg-tertiary)',
          }} />
          <button onClick={() => onChange(null)} style={{
            position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 13, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>×</button>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 6 }}>{label}</div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          style={{
            width: size, height: size, borderRadius: 14, cursor: 'pointer',
            border: dragOver ? '2px solid #8B5CF6' : '1.5px dashed var(--border)',
            background: dragOver ? 'rgba(139,92,246,0.07)' : 'var(--bg-tertiary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 26, opacity: 0.2, lineHeight: 1, fontWeight: 300 }}>+</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.4, padding: '0 10px' }}>{label}</div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
  background: 'var(--bg-tertiary)', border: '1.5px solid var(--border)',
  color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
}

const sectionStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
  padding: 20, marginBottom: 16,
}

export default function PromoMachine() {
  // Presenter
  const [presenterName, setPresenterName] = useState('Presenter')
  const [gender, setGender] = useState('Female')
  const [identity, setIdentity] = useState(null)
  const [wardrobe, setWardrobe] = useState(null)
  const [closeup1, setCloseup1] = useState(null)
  const [closeup2, setCloseup2] = useState(null)

  // Product
  const [productName, setProductName] = useState('')
  const [product1, setProduct1] = useState(null)
  const [product2, setProduct2] = useState(null)
  const [productWorn, setProductWorn] = useState(false)

  // Scene / performance
  const [envKey, setEnvKey] = useState('')
  const [environment, setEnvironment] = useState('')
  const [camera, setCamera] = useState('Handheld')
  const [vibe, setVibe] = useState('Natural')
  const [duration, setDuration] = useState(8)
  const [shotMode, setShotMode] = useState('oner')
  const [dialogue, setDialogue] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Result
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  function applyTemplate(tpl) {
    setDialogue(tpl.dialogue || '')
    setEnvKey(tpl.envKey || '')
    setEnvironment(ENV_PRESETS.find(e => e.key === tpl.envKey)?.preset || '')
    setCamera(tpl.camera || 'Handheld')
    setVibe(tpl.vibe || 'Natural')
    setDuration(tpl.duration || 8)
    setShotMode(tpl.shotMode || 'oner')
  }

  function handleEnvChipChange(key) {
    setEnvKey(key)
    setEnvironment(key ? (ENV_PRESETS.find(e => e.key === key)?.preset || '') : '')
  }

  function generate() {
    const r = buildMasterPrompt({
      name: presenterName || 'Presenter',
      gender,
      startFrameMode: false,
      refs: { identity, wardrobe, closeup1, closeup2, product1, product2 },
      productWorn,
      camera,
      vibe,
      envKey,
      environment,
      duration: Number(duration) || 8,
      shotMode,
      dialogue,
      additionalNotes,
      audioRef: false,
      voicePreset: '',
      voiceCustom: '',
    })
    setResult(r)
    setCopied(false)
  }

  function copyPrompt() {
    if (!result) return
    navigator.clipboard.writeText(result.prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(console.error)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '100px 20px 60px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Promo Machine</h1>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6 }}>
          Build a paste-ready Seedance video-ad prompt for any product or business. Test the output manually on Runway's web app.
        </div>
      </div>

      {/* Quick-start templates */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Quick start</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => applyTemplate(tpl)} style={{
              padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              background: 'var(--bg-tertiary)', border: '1.5px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{tpl.icon}</span>{tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Presenter */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Presenter</div>
        <Field label="Name">
          <input style={inputStyle} value={presenterName} onChange={e => setPresenterName(e.target.value)} placeholder="Presenter name" />
        </Field>
        <Field label="Gender">
          <ChipRow options={['Female', 'Male']} value={gender} onChange={v => v && setGender(v)} />
        </Field>
        <Field label="Reference images" sub="Identity is required for a usable prompt; wardrobe and close-ups sharpen accuracy.">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <ImageSlot value={identity} onChange={setIdentity} label="Identity" />
            <ImageSlot value={wardrobe} onChange={setWardrobe} label="Wardrobe" />
            <ImageSlot value={closeup1} onChange={setCloseup1} label="Close-up 1" />
            <ImageSlot value={closeup2} onChange={setCloseup2} label="Close-up 2" />
          </div>
        </Field>
      </div>

      {/* Product */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Product</div>
        <Field label="Name">
          <input style={inputStyle} value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Woolf With Me wool hat" />
        </Field>
        <Field label="Reference images">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <ImageSlot value={product1} onChange={setProduct1} label="Product 1" />
            <ImageSlot value={product2} onChange={setProduct2} label="Product 2" />
          </div>
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={productWorn} onChange={e => setProductWorn(e.target.checked)} />
          Product is worn (not held)
        </label>
      </div>

      {/* Scene / performance */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Scene & performance</div>
        <Field label="Environment">
          <ChipRow options={ENV_PRESETS} value={envKey} onChange={handleEnvChipChange} />
          <input style={{ ...inputStyle, marginTop: 8 }} value={environment} onChange={e => setEnvironment(e.target.value)} placeholder="Override with free text (optional)" />
        </Field>
        <Field label="Camera">
          <ChipRow options={CAMERAS} value={camera} onChange={v => v && setCamera(v)} />
        </Field>
        <Field label="Vibe">
          <ChipRow options={VIBES} value={vibe} onChange={v => v && setVibe(v)} />
        </Field>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Field label="Duration (seconds)">
            <input type="number" min={4} max={15} style={{ ...inputStyle, width: 100 }} value={duration} onChange={e => setDuration(e.target.value)} />
          </Field>
          <Field label="Shot mode">
            <ChipRow options={[{ key: 'oner', label: 'Oner' }, { key: 'multi', label: 'Multi-cut' }]} value={shotMode} onChange={v => setShotMode(v || 'oner')} />
          </Field>
        </div>
        <Field label="Dialogue">
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={dialogue} onChange={e => setDialogue(e.target.value)} placeholder="What the presenter says on camera..." />
        </Field>
        <Field label="Additional notes" sub="Action beats (e.g. 'picks it up at the start') and general direction notes.">
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Any extra direction..." />
        </Field>
      </div>

      <button onClick={generate} style={{
        width: '100%', padding: '14px 0', borderRadius: 14, fontSize: 14, fontWeight: 700,
        background: 'linear-gradient(135deg,#EC4899,#8B5CF6)', color: '#fff', border: 'none', cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
      }}>Generate prompt</button>

      {/* Results */}
      {result && (
        <div style={{ ...sectionStyle, marginTop: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Result</div>

          {result.imageOrder.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Attach reference images in this order
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {result.imageOrder.map(img => (
                  <div key={img.tag} style={{ textAlign: 'center' }}>
                    <img src={img.url} style={{
                      width: 64, height: 64, objectFit: 'cover', borderRadius: 10,
                      border: '1.5px solid var(--border)', display: 'block',
                    }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', marginTop: 4 }}>{img.tag}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{img.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Model: {result.settings.model} · Aspect: {result.settings.aspectRatio} · Duration: {result.settings.duration}s · Resolution: {result.settings.resolution}
          </div>

          <pre style={{
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12.5, lineHeight: 1.6,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 16, color: 'var(--text-primary)', fontFamily: 'inherit', maxHeight: 420, overflowY: 'auto',
          }}>{result.prompt}</pre>

          <button onClick={copyPrompt} style={{
            marginTop: 12, padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: copied ? 'rgba(34,197,94,0.15)' : 'var(--bg-tertiary)',
            color: copied ? '#22C55E' : 'var(--text-primary)',
            border: '1.5px solid var(--border)', cursor: 'pointer',
          }}>{copied ? 'Copied!' : 'Copy prompt'}</button>
        </div>
      )}
    </div>
  )
}
