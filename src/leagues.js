export const MAX_PER_LEAGUE = 20

export const LEAGUE_RANKS = [
  { rank: 1, name: 'Champion', emoji: '👑', color: '#ffd700' },
  { rank: 2, name: 'Master', emoji: '💎', color: '#b946ff' },
  { rank: 3, name: 'Diamond', emoji: '💠', color: '#00d4ff' },
  { rank: 4, name: 'Platinum', emoji: '🔷', color: '#3b82f6' },
  { rank: 5, name: 'Gold', emoji: '🥇', color: '#f59e0b' },
  { rank: 6, name: 'Copper', emoji: '🪙', color: '#b87333' },
  { rank: 7, name: 'Bronze', emoji: '🥉', color: '#cd7f32' },
  { rank: 8, name: 'Iron', emoji: '⚙️', color: '#6b7280' },
  { rank: 9, name: 'Stone', emoji: '🪨', color: '#78716c' },
  { rank: 10, name: 'Wood', emoji: '🪵', color: '#a3a3a3' },
  { rank: 11, name: 'Paper', emoji: '📄', color: '#d4d4d4' },
]

export const RANK_PROMO_DEMO = {
  11: { promote: 15, demote: 0 },
  10: { promote: 12, demote: 3 },
  9:  { promote: 12, demote: 5 },
  8:  { promote: 10, demote: 5 },
  7:  { promote: 8,  demote: 6 },
  6:  { promote: 8,  demote: 5 },
  5:  { promote: 7,  demote: 7 },
  4:  { promote: 5,  demote: 8 },
  3:  { promote: 3,  demote: 10 },
  2:  { promote: 8,  demote: 10 },
}

export function getRankInfo(rank) {
  return LEAGUE_RANKS.find(r => r.rank === rank) || LEAGUE_RANKS[10]
}

export function getPromotionZone(rank) {
  return (RANK_PROMO_DEMO[rank] || RANK_PROMO_DEMO[11]).promote
}

export function getDemotionZone(rank) {
  return (RANK_PROMO_DEMO[rank] || RANK_PROMO_DEMO[11]).demote
}

export function getStayZone(rank, totalPlayers) {
  const pd = RANK_PROMO_DEMO[rank] || RANK_PROMO_DEMO[11]
  return totalPlayers - pd.promote - pd.demote
}

export const TOURNAMENT_SIZES = {
  tournament: 20,
  semiFinals: 15,
  finals: 10,
}

export function getNextWednesdayMidnightUTC() {
  const now = new Date()
  const day = now.getUTCDay()
  let daysAhead = (3 - day + 7) % 7
  if (daysAhead === 0) daysAhead = 7
  const target = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysAhead,
    0, 0, 0, 0
  ))
  return target.getTime()
}

export function getTimeUntilSeasonEnd() {
  return Math.max(0, getNextWednesdayMidnightUTC() - Date.now())
}

export function isInLockoutPeriod() {
  return getTimeUntilSeasonEnd() < 24 * 60 * 60 * 1000
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

export function calculateWinCoins(gameId, streak = 0) {
  return calculateWinXP(gameId, streak)
}
