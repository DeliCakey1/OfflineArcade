import { VolumeSlider } from './VolumeSlider'
import ThemePicker from './ThemePicker'

export default function SettingsPage({ onBack, muted, onMuteToggle, theme, onThemeChange, animations, onAnimToggle, glass, onGlassToggle, bg, onBgToggle, waveBar, onWaveBarToggle, volume, onVolumeChange, onCloak }) {
  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <h2>⚙️ Settings</h2>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">🔊 Audio</h3>
        <div className="settings-row">
          <button className="settings-card-btn" onClick={onMuteToggle} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
            <span className="settings-card-icon">{muted ? '🔇' : '🔊'}</span>
            <span className="settings-card-label">{muted ? 'Unmuted' : 'Muted'}</span>
          </button>
          <div className="settings-slider-card">
            <span className="settings-card-icon">🔉</span>
            <VolumeSlider volume={volume} onChange={onVolumeChange} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">🎨 Appearance</h3>
        <div className="settings-row">
          <button className={`settings-card-btn ${animations ? 'active' : ''}`} onClick={onAnimToggle} aria-label={animations ? 'Disable animations' : 'Enable animations'}>
            <span className="settings-card-icon">{animations ? '✨' : '🚫'}</span>
            <span className="settings-card-label">Animations {animations ? 'On' : 'Off'}</span>
          </button>
          <button className={`settings-card-btn ${glass ? 'active' : ''}`} onClick={onGlassToggle} aria-label={glass ? 'Disable glassmorphism' : 'Enable glassmorphism'}>
            <span className="settings-card-icon">{glass ? '💎' : '🪟'}</span>
            <span className="settings-card-label">Glass {glass ? 'On' : 'Off'}</span>
          </button>
        </div>
        <div className="settings-row">
          <button className={`settings-card-btn ${bg ? 'active' : ''}`} onClick={onBgToggle} aria-label={bg ? 'Disable background' : 'Enable background'}>
            <span className="settings-card-icon">{bg ? '🖼️' : '⬛'}</span>
            <span className="settings-card-label">Background {bg ? 'On' : 'Off'}</span>
          </button>
          <button className={`settings-card-btn ${waveBar ? 'active' : ''}`} onClick={onWaveBarToggle} aria-label={waveBar ? 'Disable wave bar' : 'Enable wave bar'}>
            <span className="settings-card-icon">{waveBar ? '🌊' : '🫧'}</span>
            <span className="settings-card-label">Wave Bar {waveBar ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">🎨 Theme</h3>
        <ThemePicker current={theme} onChange={onThemeChange} />
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">🎭 Privacy</h3>
        <button className="settings-card-btn full-width" onClick={onCloak} aria-label="Tab Cloaking">
          <span className="settings-card-icon">🎭</span>
          <span className="settings-card-label">Tab Cloaking</span>
        </button>
      </div>
    </div>
  )
}
