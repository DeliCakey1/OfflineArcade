export default function NotificationRenderer({ notifications, onDismiss }) {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, pointerEvents: 'none' }}>
      {notifications.map(n => (
        <NotificationItem key={n.id} notification={n} onDismiss={() => onDismiss(n.id)} />
      ))}
    </div>
  )
}

function NotificationItem({ notification: n, onDismiss }) {
  const isAchievement = n.kind === 'achievement'
  const isEvent = n.kind === 'event'

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: isAchievement
          ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(139,92,246,0.15))'
          : isEvent
          ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(0,212,255,0.15))'
          : n.type === 'success' ? 'rgba(34,197,94,0.15)'
          : n.type === 'error' ? 'rgba(239,68,68,0.15)'
          : 'var(--card, #241845)',
        border: `1px solid ${
          isAchievement ? 'rgba(255,215,0,0.3)'
          : isEvent ? 'rgba(59,130,246,0.3)'
          : n.type === 'success' ? 'rgba(34,197,94,0.3)'
          : n.type === 'error' ? 'rgba(239,68,68,0.3)'
          : 'var(--border, rgba(255,255,255,0.1))'
        }`,
        borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'slide-in-up 0.3s ease-out',
        fontFamily: 'Fredoka, sans-serif', color: 'var(--text, #e8e0ff)',
      }}
      onClick={onDismiss}
    >
      <div style={{ fontSize: isAchievement ? 28 : 22, lineHeight: 1, flexShrink: 0 }}>
        {isAchievement ? '🏅' : isEvent ? n.emoji : n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : 'ℹ️'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isAchievement ? (
          <>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#ffd700', fontWeight: 600, marginBottom: 2 }}>Achievement Unlocked!</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{n.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{n.description}</div>
            {n.coins > 0 && <div style={{ fontSize: 12, color: '#ffd700', marginTop: 4 }}>🪙 +{n.coins} coins</div>}
          </>
        ) : isEvent ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{n.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{n.message}</div>
          </>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 500 }}>{n.message}</div>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDismiss() }} style={{
        background: 'transparent', border: 'none', color: 'var(--text-dim, #9b8ec4)',
        fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0,
      }}>×</button>
    </div>
  )
}
