import { getNameplateStyle, getNameplateBorderStyle, getNameplateEffectClass, getNameplateNeonColor, getTitleName } from '../nameplateUtils'

const STAGES = [
  { key: 'tournament', name: 'God Tournament', emoji: '🏟️', size: 20, advance: 15, color: '#f59e0b' },
  { key: 'semiFinals', name: 'Semi-Finals', emoji: '⚔️', size: 15, advance: 10, color: '#3b82f6' },
  { key: 'finals', name: 'Finals', emoji: '🏆', size: 10, advance: 3, color: '#ffd700' },
]

function PlayerSlot({ player, position, isAdvancing, isCurrentStage, isYou }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
      borderRadius: 8, fontSize: 13,
      background: isYou ? 'rgba(139,92,246,0.2)' : isAdvancing ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
      border: isYou ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
      opacity: isCurrentStage ? 1 : 0.7,
    }}>
      <span style={{ fontWeight: 700, color: isAdvancing ? '#22c55e' : 'var(--text-dim)', minWidth: 24 }}>#{position}</span>
      <span
        className={getNameplateEffectClass(player.nameplateEffect)}
        style={{ ...getNameplateStyle(player.nameplate), ...getNameplateBorderStyle(player.nameplateEffect), '--np-neon-color': getNameplateNeonColor(player.nameplateEffect) || undefined, flex: 1 }}
      >
        {player.name}{isYou ? ' (you)' : ''}
      </span>
      {getTitleName(player.title) && (
        <span style={{ fontSize: 10, opacity: 0.5 }}>{getTitleName(player.title)}</span>
      )}
      <span style={{ fontSize: 11, color: 'var(--neon-cyan)' }}>⭐{player.xp}</span>
    </div>
  )
}

function StageColumn({ stage, players, isCurrentStage, currentUserId, isFinal }) {
  const advancing = stage.advance
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 28 }}>{stage.emoji}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: stage.color }}>{stage.name}</div>
        <div style={{ fontSize: 11, opacity: 0.5 }}>{players.length}/{stage.size} players</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {players.map((p, i) => (
          <PlayerSlot
            key={p.id}
            player={p}
            position={i + 1}
            isAdvancing={i < advancing}
            isCurrentStage={isCurrentStage}
            isYou={p.id === currentUserId}
          />
        ))}
        {players.length === 0 && (
          <div style={{ textAlign: 'center', padding: 16, fontSize: 12, opacity: 0.4, color: 'var(--text-dim)' }}>
            Waiting for players...
          </div>
        )}
      </div>
      {isFinal && players.length > 0 && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))',
            border: '1px solid rgba(255,215,0,0.3)', borderRadius: 10, padding: 12,
          }}>
            <div style={{ fontSize: 12, color: '#ffd700', fontWeight: 600 }}>🏆 Top 3 Win!</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
              🥇 1st: 1000 coins · 🥈 2nd: 750 · 🥉 3rd: 500
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ConnectorArrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', alignSelf: 'center' }}>
      <div style={{
        width: 40, height: 2, background: 'linear-gradient(90deg, rgba(139,92,246,0.4), rgba(139,92,246,0.1))',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', right: -4, top: -4, width: 0, height: 0,
          borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
          borderLeft: '8px solid rgba(139,92,246,0.4)',
        }} />
      </div>
    </div>
  )
}

export default function TournamentBracket({ currentStage, allPlayers, currentUserId }) {
  const stageIndex = STAGES.findIndex(s => s.key === currentStage)
  const isComplete = currentStage === 'completed'

  return (
    <div style={{ padding: '16px 0' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>
        🏟️ Tournament Bracket
      </h3>

      {/* Stage progression indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        {STAGES.map((s, i) => {
          const isPast = isComplete || i < stageIndex
          const isCurrent = i === stageIndex
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
                background: isPast ? 'rgba(34,197,94,0.2)' : isCurrent ? `${s.color}33` : 'rgba(255,255,255,0.05)',
                border: isCurrent ? `2px solid ${s.color}` : '1px solid rgba(255,255,255,0.1)',
                color: isPast ? '#22c55e' : isCurrent ? s.color : 'var(--text-dim)',
              }}>
                {isPast ? '✓' : i + 1}
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ width: 24, height: 2, background: isPast ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Bracket columns */}
      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
        {STAGES.map((stage, i) => {
          const isActive = i === stageIndex
          const stagePlayers = isActive ? allPlayers : (i < stageIndex ? [] : allPlayers)
          return (
            <div key={stage.key} style={{ display: 'flex', flex: 1, minWidth: 0 }}>
              {i > 0 && <ConnectorArrow />}
              <StageColumn
                stage={stage}
                players={stagePlayers}
                isCurrentStage={isActive}
                currentUserId={currentUserId}
                isFinal={i === STAGES.length - 1}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
