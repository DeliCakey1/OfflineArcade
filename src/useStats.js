import { useState, useCallback } from 'react'

const STORAGE_KEY = 'arcade-stats'

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}

function getEmptyGameStats() {
  return { played: 0, won: 0, bestStreak: 0 }
}

export const ALL_GAME_IDS = [
  'rps', 'ssg', 'gtn', 'gtn-hc', 'hol', 'dice', 'coin', 'memory', 'word', 'merge',
  'reaction', 'typing', 'simon', 'slots', 'blackjack', 'whack', 'snake', 'tetris',
  'breakout', 'flappy', 'minesweeper',
]

export const ACHIEVEMENTS = [
  { id: 'first-win', name: 'First Win', emoji: '🏆', desc: 'Win any game', check: s => s._xp?.total > 0 },
  { id: 'streak-5', name: 'Hot Streak', emoji: '🔥', desc: '5 win streak in any game', check: s => maxStreak(s) >= 5 },
  { id: 'streak-10', name: 'On Fire', emoji: '🔥', desc: '10 win streak in any game', check: s => maxStreak(s) >= 10 },
  { id: 'streak-25', name: 'Unstoppable', emoji: '🔥', desc: '25 win streak in any game', check: s => maxStreak(s) >= 25 },
  { id: 'streak-50', name: 'Legendary', emoji: '🏅', desc: '50 win streak in any game', check: s => maxStreak(s) >= 50 },
  { id: 'played-1', name: 'Getting Started', emoji: '🎮', desc: 'Play your first game', check: s => totalPlayed(s) >= 1 },
  { id: 'played-50', name: 'Regular', emoji: '🎯', desc: 'Play 50 games', check: s => totalPlayed(s) >= 50 },
  { id: 'played-100', name: 'Dedicated', emoji: '🎪', desc: 'Play 100 games', check: s => totalPlayed(s) >= 100 },
  { id: 'played-500', name: 'Arcade Rat', emoji: '🐀', desc: 'Play 500 games', check: s => totalPlayed(s) >= 500 },
  { id: 'won-50', name: 'Winner', emoji: '🥇', desc: 'Win 50 games', check: s => totalWon(s) >= 50 },
  { id: 'won-100', name: 'Champion', emoji: '🏅', desc: 'Win 100 games', check: s => totalWon(s) >= 100 },
  { id: 'won-500', name: 'Undefeated', emoji: '👑', desc: 'Win 500 games', check: s => totalWon(s) >= 500 },
  { id: 'xp-100', name: 'Rising Star', emoji: '⭐', desc: 'Earn 100 XP', check: s => (s._xp?.total || 0) >= 100 },
  { id: 'xp-1000', name: 'Power Player', emoji: '💫', desc: 'Earn 1,000 XP', check: s => (s._xp?.total || 0) >= 1000 },
  { id: 'xp-5000', name: 'XP Master', emoji: '🌟', desc: 'Earn 5,000 XP', check: s => (s._xp?.total || 0) >= 5000 },
  { id: 'xp-10000', name: 'XP Legend', emoji: '✨', desc: 'Earn 10,000 XP', check: s => (s._xp?.total || 0) >= 10000 },
  { id: 'played-all', name: 'Completionist', emoji: '🎯', desc: 'Play all 21 games', check: s => ALL_GAME_IDS.every(id => (s[id]?.played || 0) > 0) },
  { id: 'daily', name: 'Daily Devotee', emoji: '📅', desc: 'Complete a daily challenge', check: s => s._dailyCompleted === getDailySeed() },
  { id: 'favorite-5', name: 'Picky', emoji: '⭐', desc: 'Favorite 5 games', check: s => (s._favorites?.length || 0) >= 5 },
]

function maxStreak(s) {
  return Math.max(0, ...ALL_GAME_IDS.map(id => s[id]?.bestStreak || 0))
}

function totalPlayed(s) {
  return ALL_GAME_IDS.reduce((sum, id) => sum + (s[id]?.played || 0), 0)
}

function totalWon(s) {
  return ALL_GAME_IDS.reduce((sum, id) => sum + (s[id]?.won || 0), 0)
}

export function getDailySeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export function getDailyGame(allGameIds) {
  const seed = getDailySeed()
  const gameIdx = ((seed * 40503) >>> 0) % allGameIds.length
  const diffIdx = ((seed * 12345) >>> 0) % 4
  const diffs = ['Easy', 'Normal', 'Hard', 'Insane']
  return { gameId: allGameIds[gameIdx], difficulty: diffs[diffIdx], seed }
}

export function getTimeUntilTomorrow() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow - now
}

export default function useStats(gameId) {
  const [stats, setStats] = useState(() => loadStats())

  const gameStats = stats[gameId] || getEmptyGameStats()

  const recordGame = useCallback((won, streak = 0) => {
    if (won) {
      try { window.dispatchEvent(new CustomEvent('arcade-win', { detail: { gameId } })) } catch {}
    }
    setStats(prev => {
      const current = prev[gameId] || getEmptyGameStats()
      const xpEarned = won ? 10 + Math.min(streak, 10) * 2 : 0
      const prevXp = prev._xp?.total || 0
      const recent = prev._recent || []
      const newRecent = [gameId, ...recent.filter(id => id !== gameId)].slice(0, 8)
      const updated = {
        ...prev,
        [gameId]: {
          played: current.played + 1,
          won: current.won + (won ? 1 : 0),
          bestStreak: Math.max(current.bestStreak, streak),
        },
        _xp: { total: prevXp + xpEarned },
        _recent: newRecent,
      }
      saveStats(updated)
      return updated
    })
  }, [gameId])

  const clearStats = useCallback(() => {
    const empty = {}
    saveStats(empty)
    setStats(empty)
  }, [])

  const setFavorite = useCallback((id, val) => {
    setStats(prev => {
      const favs = prev._favorites || []
      const isFav = favs.includes(id)
      const shouldAdd = val !== undefined ? val : !isFav
      const updated = {
        ...prev,
        _favorites: shouldAdd ? [...new Set([...favs, id])] : favs.filter(f => f !== id),
      }
      saveStats(updated)
      return updated
    })
  }, [])

  const isFavorite = useCallback((id) => {
    return (stats._favorites || []).includes(id)
  }, [stats._favorites])

  const markDailyCompleted = useCallback(() => {
    setStats(prev => {
      const updated = { ...prev, _dailyCompleted: getDailySeed() }
      saveStats(updated)
      return updated
    })
  }, [])

  const allStats = stats
  const xp = stats._xp?.total || 0
  const recent = stats._recent || []
  const favorites = stats._favorites || []
  const earnedAchievements = ACHIEVEMENTS.filter(a => a.check(stats)).map(a => a.id)
  const newAchievements = earnedAchievements.filter(id => !(stats._seenAchievements || []).includes(id))

  const markAchievementsSeen = useCallback(() => {
    setStats(prev => {
      const updated = { ...prev, _seenAchievements: earnedAchievements }
      saveStats(updated)
      return updated
    })
  }, [earnedAchievements])

  const totalPlayedCount = totalPlayed(stats)
  const totalWonCount = totalWon(stats)

  return {
    gameStats, recordGame, clearStats, allStats,
    xp, recent, favorites, setFavorite, isFavorite,
    earnedAchievements, newAchievements, markAchievementsSeen,
    markDailyCompleted, totalPlayedCount, totalWonCount,
  }
}
