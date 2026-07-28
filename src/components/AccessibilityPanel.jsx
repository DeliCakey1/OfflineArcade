import { useState, useEffect } from 'react'

function getSaved(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      className={`settings-card-btn ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      style={{ cursor: 'pointer' }}
    >
      <span className="settings-card-icon">{checked ? '\u2705' : '\u2B1C'}</span>
      <span className="settings-card-label">{label}</span>
      <span className="switch-toggle" style={{
        marginLeft: 'auto',
        width: 40, height: 22, borderRadius: 11,
        background: checked ? 'var(--neon-green)' : 'rgba(255,255,255,0.12)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2,
          left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }} />
      </span>
    </button>
  )
}

export default function AccessibilityPanel({ onBack }) {
  const [highContrast, setHighContrast] = useState(() => getSaved('arcade-high-contrast', 'off') === 'on')
  const [colorBlind, setColorBlind] = useState(() => getSaved('arcade-colorblind', 'normal'))
  const [reducedMotion, setReducedMotion] = useState(() => getSaved('arcade-reduced-motion', 'off') === 'on')
  const [textSize, setTextSize] = useState(() => parseInt(getSaved('arcade-text-size', '16'), 10) || 16)
  const [boldText, setBoldText] = useState(() => getSaved('arcade-bold-text', 'off') === 'on')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast)
    try { localStorage.setItem('arcade-high-contrast', highContrast ? 'on' : 'off') } catch {}
  }, [highContrast])

  useEffect(() => {
    document.body.classList.remove('colorblind-deuteranopia', 'colorblind-protanopia', 'colorblind-tritanopia')
    if (colorBlind !== 'normal') {
      document.body.classList.add('colorblind-' + colorBlind)
    }
    try { localStorage.setItem('arcade-colorblind', colorBlind) } catch {}
  }, [colorBlind])

  useEffect(() => {
    document.body.classList.toggle('reduced-motion', reducedMotion)
    try { localStorage.setItem('arcade-reduced-motion', reducedMotion ? 'on' : 'off') } catch {}
  }, [reducedMotion])

  useEffect(() => {
    document.documentElement.style.fontSize = textSize + 'px'
    try { localStorage.setItem('arcade-text-size', String(textSize)) } catch {}
  }, [textSize])

  useEffect(() => {
    document.body.classList.toggle('bold-text', boldText)
    try { localStorage.setItem('arcade-bold-text', boldText ? 'on' : 'off') } catch {}
  }, [boldText])

  function showSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    setHighContrast(false)
    setColorBlind('normal')
    setReducedMotion(false)
    setTextSize(16)
    setBoldText(false)
    document.documentElement.style.fontSize = '16px'
    showSaved()
  }

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <h2>♿ Accessibility</h2>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">👁️ Visual</h3>
        <div className="settings-row">
          <Switch
            checked={highContrast}
            onChange={(v) => { setHighContrast(v); showSaved() }}
            label="High Contrast Mode"
          />
        </div>
        <div className="settings-row">
          <div className="settings-card-btn full-width" style={{ cursor: 'default' }}>
            <span className="settings-card-icon">🎨</span>
            <span className="settings-card-label">Color Blind Mode</span>
            <select
              value={colorBlind}
              onChange={(e) => { setColorBlind(e.target.value); showSaved() }}
              style={{
                marginLeft: 'auto', background: 'transparent', border: 'none',
                color: 'var(--text-light)', fontFamily: 'Fredoka, sans-serif',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', outline: 'none',
                padding: '4px 8px', borderRadius: 8,
              }}
              aria-label="Color blind mode"
            >
              <option value="normal">Normal</option>
              <option value="deuteranopia">Deuteranopia (Red-Green)</option>
              <option value="protanopia">Protanopia (Red)</option>
              <option value="tritanopia">Tritanopia (Blue)</option>
            </select>
          </div>
        </div>
        <div className="settings-row">
          <Switch
            checked={reducedMotion}
            onChange={(v) => { setReducedMotion(v); showSaved() }}
            label="Reduced Motion"
          />
        </div>
        <div className="settings-row">
          <Switch
            checked={boldText}
            onChange={(v) => { setBoldText(v); showSaved() }}
            label="Bold Text"
          />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">🔤 Text Size</h3>
        <div className="settings-row">
          <div className="settings-card-btn full-width" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="settings-card-icon">🔤</span>
              <span className="settings-card-label">Text Size: {textSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="24"
              value={textSize}
              onChange={(e) => { setTextSize(parseInt(e.target.value, 10)); showSaved() }}
              aria-label="Text size"
              style={{
                width: '100%', accentColor: 'var(--neon-purple)',
                height: 4, cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)' }}>
              <span>14px</span>
              <span>24px</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">⚡ Actions</h3>
        <div className="settings-row">
          <button
            className="settings-card-btn full-width"
            onClick={handleReset}
            style={{ cursor: 'pointer', borderColor: 'var(--neon-pink)' }}
          >
            <span className="settings-card-icon">🔄</span>
            <span className="settings-card-label" style={{ color: 'var(--neon-pink)' }}>Reset All</span>
          </button>
        </div>
      </div>

      {saved && <div className="cloak-saved-toast">Settings saved!</div>}
    </div>
  )
}
