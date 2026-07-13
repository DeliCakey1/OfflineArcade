export const MAX_PER_LEAGUE = 15
export const PROMOTE_COUNT = 3
export const DEMOTE_COUNT = 3
export const SEASON_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export const LEAGUE_RANKS = [
  { rank: 1, name: 'Champion', emoji: '👑', color: '#ffd700' },
  { rank: 2, name: 'Master', emoji: '💎', color: '#b946ff' },
  { rank: 3, name: 'Diamond', emoji: '💠', color: '#00d4ff' },
  { rank: 4, name: 'Platinum', emoji: '🔷', color: '#3b82f6' },
  { rank: 5, name: 'Gold', emoji: '🥇', color: '#f59e0b' },
  { rank: 6, name: 'Silver', emoji: '🥈', color: '#94a3b8' },
  { rank: 7, name: 'Bronze', emoji: '🥉', color: '#cd7f32' },
  { rank: 8, name: 'Iron', emoji: '⚙️', color: '#6b7280' },
  { rank: 9, name: 'Stone', emoji: '🪨', color: '#78716c' },
  { rank: 10, name: 'Wood', emoji: '🪵', color: '#a3a3a3' },
]

export function getRankInfo(rank) {
  return LEAGUE_RANKS.find(r => r.rank === rank) || LEAGUE_RANKS[9]
}

export function getPromotionZone(totalPlayers) {
  return PROMOTE_COUNT
}

export function getDemotionZone(totalPlayers) {
  return DEMOTE_COUNT
}

export function getStayZone(totalPlayers) {
  return totalPlayers - PROMOTE_COUNT - DEMOTE_COUNT
}

export function getSeasonEndTime(seasonStart) {
  return seasonStart + SEASON_DURATION_MS
}

export function getTimeUntilSeasonEnd(seasonStart) {
  const end = getSeasonEndTime(seasonStart)
  const now = Date.now()
  return Math.max(0, end - now)
}

export function formatSeasonTime(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
