export default function ClanCard({ clan, onJoin, isInClan }) {
  if (!clan) return null
  const bannerColor = clan.banner?.color || '#b946ff'

  return (
    <div className="clan-card">
      <div className="clan-card-banner" style={{ borderColor: bannerColor }}>
        <span className="clan-card-icon">{clan.banner?.icon || '⚔️'}</span>
        <div className="clan-card-info">
          <span className="clan-card-tag" style={{ color: bannerColor }}>[{clan.tag}]</span>
          <span className="clan-card-name">{clan.name}</span>
        </div>
      </div>
      <div className="clan-card-stats">
        <span>{clan.memberCount || 0}/20 members</span>
        <span>{clan.weeklyXP?.toLocaleString() || 0} weekly XP</span>
        <span>{clan.wins || 0} wins</span>
      </div>
      {clan.description && <p className="clan-card-desc">{clan.description}</p>}
      {!isInClan && (
        <button className="clan-btn primary small" onClick={onJoin} disabled={clan.memberCount >= 20}>
          {clan.memberCount >= 20 ? 'Full' : 'Join'}
        </button>
      )}
    </div>
  )
}
