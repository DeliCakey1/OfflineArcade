import { useState, useEffect } from 'react'
import { bannerColorCss } from '../bannerColors'

const STORAGE_KEY = 'arcade-banners-collapsed'

export default function BannerStack({ announcements, showGuestBanner, onSignIn }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {}
  }, [collapsed])

  const list = announcements && announcements.length ? announcements : []
  const count = list.length
  const hasAnything = showGuestBanner || count > 0
  if (!hasAnything) return null

  return (
    <div className="banner-stack">
      <button
        className={`banner-collapse-btn${collapsed ? ' collapsed' : ''}`}
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show announcements' : 'Hide announcements'}
        title={collapsed ? 'Show announcements' : 'Hide announcements'}
      >
        <span className="banner-collapse-arrow" aria-hidden="true">{collapsed ? '▼' : '▲'}</span>
        <span className="banner-collapse-label">
          {collapsed
            ? (count > 0 ? `Show announcements (${count})` : 'Show announcements')
            : (count > 0 ? 'Hide announcements' : 'Hide')}
        </span>
      </button>
      {!collapsed && (
        <div className="banner-list">
          {showGuestBanner && (
            <div className="guest-banner">
              You are not signed in. <span className="guest-banner-link" onClick={onSignIn}>Sign In</span> to save your data across devices!
            </div>
          )}
          {list.map(b => (
            <div key={b.id} className="announcement-banner" style={{ background: bannerColorCss(b.color) }} role="status">
              {b.emoji} {b.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
