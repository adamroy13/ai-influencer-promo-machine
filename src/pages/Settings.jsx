import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { startHiggsfieldOAuthPopup, disconnectHF, isHFConnected } from '../utils/higgsfieldAuth'
import {
  getRunwayKey,
  setRunwayKey,
  isRunwayConnected,
  getActiveVideoProvider,
  setActiveVideoProvider,
  getActiveImageProvider,
  setActiveImageProvider,
  getRunwayDefaultModel,
  setRunwayDefaultModel,
  getRunwayDefaultImageModel,
  setRunwayDefaultImageModel,
  RUNWAY_MODELS,
  RUNWAY_IMAGE_MODELS,
  isRunwayAssetNormalizationEnabled,
  setRunwayAssetNormalizationEnabled,
} from '../utils/runwayGenerate'
import { useTheme } from '../context/theme'

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  )
}

const CLAUDE_KEY = 'claude_api_key'

export default function Settings() {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const [hfConnected, setHfConnected] = useState(isHFConnected)
  const [hfLoading, setHfLoading] = useState(false)
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem(CLAUDE_KEY) || '')
  const [claudeInput, setClaudeInput] = useState('')
  const [showClaudeInput, setShowClaudeInput] = useState(false)

  // Runway ML state
  const [runwayKey, setRunwayKeyState] = useState(getRunwayKey)
  const [runwayInput, setRunwayInput] = useState('')
  const [showRunwayInput, setShowRunwayInput] = useState(false)
  const [activeProvider, setActiveProviderState] = useState(getActiveVideoProvider)
  const [activeImageProvider, setActiveImageProviderState] = useState(getActiveImageProvider)
  const [runwayModel, setRunwayModelState] = useState(getRunwayDefaultModel)
  const [runwayImageModel, setRunwayImageModelState] = useState(getRunwayDefaultImageModel)
  const [normalizeAssets, setNormalizeAssets] = useState(isRunwayAssetNormalizationEnabled)

  function toggleNormalizeAssets() {
    const next = !normalizeAssets
    setNormalizeAssets(next)
    setRunwayAssetNormalizationEnabled(next)
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('connected') === '1') {
      setHfConnected(true)
    }
  }, [location.search])

  async function connectHiggsfield() {
    setHfLoading(true)
    try {
      await startHiggsfieldOAuthPopup()
      setHfConnected(true)
    } catch (e) {
      if (e.message !== 'cancelled') alert('Failed to connect Higgsfield: ' + e.message)
    } finally {
      setHfLoading(false)
    }
  }

  function disconnectHighgsfield() {
    if (!confirm('Disconnect your Higgsfield account?')) return
    disconnectHF()
    setHfConnected(false)
  }

  function saveRunway() {
    const k = runwayInput.trim()
    if (!k) return
    setRunwayKey(k)
    setRunwayKeyState(k)
    setRunwayInput('')
    setShowRunwayInput(false)
    // Auto switch to runway as active video provider
    setActiveVideoProvider('runway')
    setActiveProviderState('runway')
  }

  function removeRunway() {
    if (!confirm('Remove your Runway ML API key?')) return
    setRunwayKey('')
    setRunwayKeyState('')
    setRunwayInput('')
    setShowRunwayInput(false)
    if (activeProvider === 'runway') {
      setActiveVideoProvider('higgsfield')
      setActiveProviderState('higgsfield')
    }
    if (activeImageProvider === 'runway') {
      setActiveImageProvider('higgsfield')
      setActiveImageProviderState('higgsfield')
    }
  }

  function changeActiveProvider(p) {
    setActiveVideoProvider(p)
    setActiveProviderState(p)
  }

  function changeActiveImageProvider(p) {
    setActiveImageProvider(p)
    setActiveImageProviderState(p)
  }

  function changeRunwayModel(m) {
    setRunwayDefaultModel(m)
    setRunwayModelState(m)
  }

  function changeRunwayImageModel(m) {
    setRunwayDefaultImageModel(m)
    setRunwayImageModelState(m)
  }

  return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 28 }}>Settings</h1>

        <Section title="Appearance">
          <div style={{ display: 'flex', gap: 10 }}>
            {(['light', 'dark']).map(val => {
              const on = theme === val
              return (
                <button key={val} onClick={e => { if (!on) toggle(e.clientX, e.clientY) }} style={{
                  flex: 1, padding: '14px 12px', borderRadius: 12, cursor: on ? 'default' : 'pointer',
                  border: `1.5px solid ${on ? '#8B5CF6' : 'var(--border)'}`,
                  background: on ? 'rgba(139,92,246,0.09)' : 'var(--bg)',
                  color: on ? '#8B5CF6' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  boxShadow: on ? '0 0 0 1px #8B5CF655' : 'none',
                }}>
                  {val === 'light' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  )}
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Runway ML (Direct API)">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Connect your Runway developer API secret key (from <a href="https://dev.runwayml.com" target="_blank" rel="noreferrer" style={{ color: '#8B5CF6', textDecoration: 'underline' }}>dev.runwayml.com</a>) to generate influencer videos using <strong>Gen-4 Turbo</strong>, <strong>Gen-4.5</strong>, or <strong>Seedance 2.5</strong>, and images using <strong>Gen-4 Image</strong> or <strong>Gen-4 Image Turbo</strong>.
          </p>
          {runwayKey ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#34C759' }}>Runway connected</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>···{runwayKey.slice(-4)}</span>
                </div>
                <button
                  onClick={removeRunway}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, color: '#FF3B30', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', fontWeight: 500, cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>

              {/* Default Model */}
              <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>DEFAULT RUNWAY MODEL</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {RUNWAY_MODELS.map(m => {
                    const active = runwayModel === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => changeRunwayModel(m.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 10,
                          border: `1.5px solid ${active ? '#8B5CF6' : 'var(--border)'}`,
                          background: active ? 'rgba(139,92,246,0.08)' : 'var(--bg)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#8B5CF6' : 'var(--text-primary)' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: active ? '#8B5CF6' : 'var(--text-tertiary)', marginTop: 2 }}>{m.badge}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Seedance Reference Normalization */}
              <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>SEEDANCE ASSET NORMALIZATION</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      Normalizes references to RGB JPEG (max 1400px, 85% quality, stripped metadata) and uploads ephemeral <code style={{ fontFamily: 'monospace' }}>runway://</code> URIs.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleNormalizeAssets}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 700,
                      border: `1.5px solid ${normalizeAssets ? '#8B5CF6' : 'var(--border)'}`,
                      background: normalizeAssets ? 'rgba(139,92,246,0.12)' : 'var(--bg)',
                      color: normalizeAssets ? '#8B5CF6' : 'var(--text-tertiary)',
                      cursor: 'pointer',
                    }}
                  >
                    {normalizeAssets ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Default Provider Switcher */}
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>DEFAULT VIDEO ENGINE</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => changeActiveProvider('runway')}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10,
                      border: `1.5px solid ${activeProvider === 'runway' ? '#8B5CF6' : 'var(--border)'}`,
                      background: activeProvider === 'runway' ? 'rgba(139,92,246,0.08)' : 'var(--bg)',
                      color: activeProvider === 'runway' ? '#8B5CF6' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Runway ML {activeProvider === 'runway' ? '✓ (Active)' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeActiveProvider('higgsfield')}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10,
                      border: `1.5px solid ${activeProvider === 'higgsfield' ? '#8B5CF6' : 'var(--border)'}`,
                      background: activeProvider === 'higgsfield' ? 'rgba(139,92,246,0.08)' : 'var(--bg)',
                      color: activeProvider === 'higgsfield' ? '#8B5CF6' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Higgsfield {activeProvider === 'higgsfield' ? '✓ (Active)' : ''}
                  </button>
                </div>
              </div>

              {/* Default Image Model */}
              <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>DEFAULT RUNWAY IMAGE MODEL</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {RUNWAY_IMAGE_MODELS.map(m => {
                    const active = runwayImageModel === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => changeRunwayImageModel(m.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 10,
                          border: `1.5px solid ${active ? '#8B5CF6' : 'var(--border)'}`,
                          background: active ? 'rgba(139,92,246,0.08)' : 'var(--bg)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#8B5CF6' : 'var(--text-primary)' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: active ? '#8B5CF6' : 'var(--text-tertiary)', marginTop: 2 }}>{m.badge}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Default Image Provider Switcher */}
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>DEFAULT IMAGE ENGINE</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => changeActiveImageProvider('runway')}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10,
                      border: `1.5px solid ${activeImageProvider === 'runway' ? '#8B5CF6' : 'var(--border)'}`,
                      background: activeImageProvider === 'runway' ? 'rgba(139,92,246,0.08)' : 'var(--bg)',
                      color: activeImageProvider === 'runway' ? '#8B5CF6' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Runway ML {activeImageProvider === 'runway' ? '✓ (Active)' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeActiveImageProvider('higgsfield')}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10,
                      border: `1.5px solid ${activeImageProvider === 'higgsfield' ? '#8B5CF6' : 'var(--border)'}`,
                      background: activeImageProvider === 'higgsfield' ? 'rgba(139,92,246,0.08)' : 'var(--bg)',
                      color: activeImageProvider === 'higgsfield' ? '#8B5CF6' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Higgsfield {activeImageProvider === 'higgsfield' ? '✓ (Active)' : ''}
                  </button>
                </div>
              </div>
            </div>
          ) : showRunwayInput ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                type="password"
                value={runwayInput}
                onChange={e => setRunwayInput(e.target.value)}
                placeholder="key_... or sk_..."
                onKeyDown={e => {
                  if (e.key === 'Enter') saveRunway()
                  if (e.key === 'Escape') setShowRunwayInput(false)
                }}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'monospace' }}
              />
              <button
                onClick={saveRunway}
                style={{ padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#1D1D1F', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Save
              </button>
              <button
                onClick={() => setShowRunwayInput(false)}
                style={{ padding: '10px 14px', borderRadius: 8, fontSize: 14, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRunwayInput(true)}
              style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#1D1D1F', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Add Runway API Key
            </button>
          )}
        </Section>

        <Section title="Higgsfield">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Connect your Higgsfield account to generate influencer images directly in the app. Images use your own Higgsfield credits.
          </p>
          {hfConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#34C759' }}>Higgsfield connected</span>
              </div>
              <button onClick={disconnectHighgsfield} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, color: '#FF3B30', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', fontWeight: 500, cursor: 'pointer' }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectHiggsfield}
              disabled={hfLoading}
              style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#1D1D1F', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, opacity: hfLoading ? 0.6 : 1, cursor: 'pointer' }}
            >
              {hfLoading ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                  Connecting…
                </>
              ) : (
                'Connect Higgsfield'
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </button>
          )}
        </Section>

        <Section title="Claude AI">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Add your Anthropic API key to let Claude analyze the image just before generating your product character sheet.
          </p>
          {claudeKey ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#34C759' }}>Claude connected</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>···{claudeKey.slice(-4)}</span>
                </div>
                <button
                  onClick={() => { localStorage.removeItem(CLAUDE_KEY); setClaudeKey(''); setClaudeInput(''); setShowClaudeInput(false) }}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, color: '#FF3B30', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', fontWeight: 500, cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : showClaudeInput ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                type="password"
                value={claudeInput}
                onChange={e => setClaudeInput(e.target.value)}
                placeholder="sk-ant-..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && claudeInput.trim()) {
                    const k = claudeInput.trim()
                    localStorage.setItem(CLAUDE_KEY, k)
                    setClaudeKey(k)
                    setClaudeInput('')
                    setShowClaudeInput(false)
                  }
                }}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'monospace' }}
              />
              <button
                onClick={() => {
                  const k = claudeInput.trim()
                  if (!k) return
                  localStorage.setItem(CLAUDE_KEY, k)
                  setClaudeKey(k)
                  setClaudeInput('')
                  setShowClaudeInput(false)
                }}
                style={{ padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#1D1D1F', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClaudeInput(true)}
              style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#1D1D1F', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Add API Key
            </button>
          )}
        </Section>
      </div>
    </div>
  )
}
