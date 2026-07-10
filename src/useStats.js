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

export default function useStats(gameId) {
  const [stats, setStats] = useState(() => loadStats())

  const gameStats = stats[gameId] || getEmptyGameStats()

  const recordGame = useCallback((won, streak = 0) => {
    setStats(prev => {
      const current = prev[gameId] || getEmptyGameStats()
      const updated = {
        ...prev,
        [gameId]: {
          played: current.played + 1,
          won: current.won + (won ? 1 : 0),
          bestStreak: Math.max(current.bestStreak, streak),
        },
      }
      saveStats(updated)
      return updated
    })
  }, [gameId])

  const allStats = stats

  const totalPlayed = Object.values(stats).reduce((s, g) => s + g.played, 0)
  const totalWon = Object.values(stats).reduce((s, g) => s + g.won, 0)

  return { gameStats, recordGame, allStats, totalPlayed, totalWon }
}
