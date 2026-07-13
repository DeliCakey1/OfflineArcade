export const MAX_PER_LEAGUE = 15
export const PROMOTE_COUNT = 3
export const DEMOTE_COUNT = 3

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

export function getPromotionZone() {
  return PROMOTE_COUNT
}

export function getDemotionZone() {
  return DEMOTE_COUNT
}

export function getStayZone(totalPlayers) {
  return totalPlayers - PROMOTE_COUNT - DEMOTE_COUNT
}

export function getNextWednesdayMidnightPST() {
  const now = new Date()
  const laTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  const laTime = new Date(laTimeStr)
  const day = laTime.getDay()
  let daysAhead = (3 - day + 7) % 7
  if (daysAhead === 0) daysAhead = 7
  const target = new Date(laTime)
  target.setDate(target.getDate() + daysAhead)
  target.setHours(0, 0, 0, 0)
  const laOffset = now.getTime() - laTime.getTime()
  return target.getTime() + laOffset
}

export function getTimeUntilSeasonEnd() {
  return Math.max(0, getNextWednesdayMidnightPST() - Date.now())
}

export function formatSeasonTime(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export const GAME_XP = {
  rps: 10,
  ssg: 16,
  gtn: 20,
  'gtn-hc': 16,
  hol: 16,
  dice: 12,
  coin: 10,
  memory: 24,
  word: 20,
  merge: 30,
  reaction: 12,
  typing: 16,
  simon: 20,
  slots: 10,
  blackjack: 16,
  whack: 16,
  snake: 30,
  tetris: 30,
  breakout: 24,
  flappy: 20,
  minesweeper: 30,
}

export function calculateWinXP(gameId, streak = 0) {
  const base = GAME_XP[gameId] || 20
  const streakBonus = Math.min(streak, 10)
  return base + streakBonus
}
