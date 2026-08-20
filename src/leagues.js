export const MAX_PER_LEAGUE = 20

export const LEAGUE_RANKS = [
  { rank: 1, name: 'God', emoji: '⚡', color: '#ffd700' },
  { rank: 2, name: 'Phoenix', emoji: '🔥', color: '#ff6b35' },
  { rank: 3, name: 'Cosmic', emoji: '🌌', color: '#b946ff' },
  { rank: 4, name: 'Thunderbird', emoji: '🪶', color: '#00d4ff' },
  { rank: 5, name: 'Monster', emoji: '👹', color: '#22c55e' },
  { rank: 6, name: 'Dinosaur', emoji: '🦕', color: '#3b82f6' },
  { rank: 7, name: 'Lion', emoji: '🦁', color: '#f59e0b' },
  { rank: 8, name: 'Bird', emoji: '🐦', color: '#a3a3a3' },
  { rank: 9, name: 'Insect', emoji: '🐛', color: '#78716c' },
  { rank: 10, name: 'Microbe', emoji: '🦠', color: '#6b7280' },
]

export const RANK_PROMO_DEMO = {
  10: { promote: 15, demote: 0 },
  9:  { promote: 12, demote: 3 },
  8:  { promote: 10, demote: 5 },
  7:  { promote: 8,  demote: 6 },
  6:  { promote: 8,  demote: 8 },
  5:  { promote: 7,  demote: 10 },
  4:  { promote: 5,  demote: 10 },
  3:  { promote: 5,  demote: 12 },
  2:  { promote: 5,  demote: 15 },
  1:  { promote: 8,  demote: 10 },
}

export function getRankInfo(rank) {
  return LEAGUE_RANKS.find(r => r.rank === rank) || LEAGUE_RANKS[9]
}

export function getPromotionZone(rank) {
  return (RANK_PROMO_DEMO[rank] || RANK_PROMO_DEMO[10]).promote
}

export function getDemotionZone(rank) {
  return (RANK_PROMO_DEMO[rank] || RANK_PROMO_DEMO[10]).demote
}

export function getStayZone(rank, totalPlayers) {
  const pd = RANK_PROMO_DEMO[rank] || RANK_PROMO_DEMO[10]
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
  lightsout: 20,
  mastermind: 20,
  dodge: 16,
  mergeblitz: 24,
  connect4: 20,
  sudoku: 22,
  mathdash: 18,
  wordle: 20,
  asteroids: 24,
  fruitslice: 24,
  centipede: 20,
  pong: 16,
  spaceinvaders: 24,
}

export const GAME_COINS = {
  rps: 5,
  ssg: 8,
  gtn: 10,
  'gtn-hc': 8,
  hol: 8,
  dice: 6,
  coin: 5,
  memory: 12,
  word: 10,
  merge: 15,
  reaction: 8,
  typing: 8,
  simon: 10,
  slots: 5,
  blackjack: 8,
  whack: 8,
  snake: 6,
  tetris: 6,
  breakout: 6,
  flappy: 6,
  minesweeper: 8,
  lightsout: 8,
  mastermind: 8,
  dodge: 6,
  mergeblitz: 10,
  connect4: 8,
  sudoku: 10,
  mathdash: 8,
  wordle: 8,
  asteroids: 6,
  fruitslice: 8,
  centipede: 6,
  pong: 6,
  spaceinvaders: 8,
}

export const SCORE_BASED_GAMES = ['snake', 'tetris', 'breakout', 'flappy', 'minesweeper', 'mathdash', 'typing', 'mergeblitz', 'asteroids', 'fruitslice', 'centipede', 'spaceinvaders']

export function calculateWinXP(gameId, streak = 0, score = 0) {
  if (SCORE_BASED_GAMES.includes(gameId)) {
    if (!score || score <= 0) return 0
    const base = GAME_XP[gameId] || 20
    return Math.min(base, Math.max(1, Math.round(score * base / 150)))
  }
  const base = GAME_XP[gameId] || 20
  const streakBonus = Math.min(streak, 10)
  return base + streakBonus
}

export function calculateWinCoins(gameId, streak = 0, score = 0) {
  if (SCORE_BASED_GAMES.includes(gameId)) {
    if (!score || score <= 0) return 0
    const base = GAME_COINS[gameId] || 2
    return Math.min(base, Math.max(1, Math.round(score * base / 150)))
  }
  const base = GAME_COINS[gameId] || 5
  const streakBonus = Math.min(Math.floor(streak / 3), 5)
  return base + streakBonus
}

const LEVEL_BASE = 10
const LEVEL_MULTIPLIER = 1.25

function levelXpNeeded(level) {
  if (level <= 0) return LEVEL_BASE
  return Math.ceil(levelXpNeeded(level - 1) * LEVEL_MULTIPLIER)
}

export function getLevel(xp) {
  let level = 0
  let remaining = xp || 0
  while (remaining >= levelXpNeeded(level)) {
    remaining -= levelXpNeeded(level)
    level++
  }
  return {
    level,
    xpInLevel: remaining,
    xpNeeded: levelXpNeeded(level),
  }
}

export function getLevelReward(level) {
  return Math.floor(5 * Math.pow(1.3, level))
}
