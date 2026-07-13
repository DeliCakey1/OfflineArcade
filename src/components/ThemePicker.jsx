import { useState } from 'react'
import { THEMES, THEME_ORDER } from '../themes'

export default function ThemePicker({ current, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="theme-picker">
      <button className="settings-btn" onClick={() => setOpen(!open)} title="Change Theme" aria-expanded={open} aria-haspopup="listbox">
        {THEMES[current].emoji}
      </button>
      {open && (
        <div className="theme-dropdown">
          {THEME_ORDER.map(id => (
            <button key={id} className={`theme-option ${id === current ? 'active' : ''}`} onClick={() => { onChange(id); setOpen(false) }}>
              <span className="theme-option-emoji">{THEMES[id].emoji}</span>
              <span className="theme-option-name">{THEMES[id].name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
