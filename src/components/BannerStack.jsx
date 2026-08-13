import { useState } from 'react'
import { bannerColorCss } from '../bannerColors'

export default function BannerStack({ announcements, showGuestBanner, onSignIn }) {
  const [collapsed, setCollapsed] = useState(false)

  const list = announcements && announcements.length ? announcements : []
  const count = list.length

  return (
    <div className="banner-stack">
      {showGuestBanner && (
        <div className="guest-banner">
          You are not signed in. <span className="guest-banner-link" onClick={onSignIn}>Sign In</span> to save your data across devices!
        </div>
      )}
      {count > 0 && (
        <button
          className={`banner-collapse-btn${collapsed ? ' collapsed' : ''}`}
          onClick={() => setCollapsed(c => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Show announcements' : 'Hide announcements'}
          title={collapsed ? 'Show announcements' : 'Hide announcements'}
        >
          <span className="banner-collapse-arrow" aria-hidden="true">{collapsed ? '▼' : '▲'}</span>
          <span className="banner-collapse-label">
            {collapsed ? `Show announcements (${count})` : 'Hide announcements'}
          </span>
        </button>
      )}
      {!collapsed && count > 0 && (
        <div className="banner-list">
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
