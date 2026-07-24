import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ACHIEVEMENT_COIN_REWARDS } from './shopItems'
import { SCORE_BASED_GAMES, GAME_XP } from './leagues'

let currentUserId = null
let statsListeners = new Set()
let sharedStats = {}
let loadPromise = null
let saveTimer = null

export function setCurrentUserId(uid) {
  currentUserId = uid
  if (uid) {
    loadFromFirestore(uid)
  } else {
    sharedStats = {}
    notifyListeners()
  }
}

export function clearCurrentUserId() {
  currentUserId = null
  sharedStats = {}
  notifyListeners()
}

function notifyListeners() {
  for (const fn of statsListeners) {
    try { fn({ ...sharedStats }) } catch {}
  }
}

async function loadFromFirestore(uid) {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      const { loadPlayerStats, getPlayer, savePlayerStats } = await import('./leagueService')
      let blob = await loadPlayerStats(uid)
      let player = null

      if (!blob) {
        player = await getPlayer(uid)
        if (player) {
          blob = {}
          if (player.xp) blob._xp = { total: player.xp }
          if (player.coins) blob._coins = player.coins
          if (player.title) blob._activeTitle = player.title
          if (player.nameplate) blob._activeNameplate = player.nameplate
          if (player.nameplateEffect) blob._activeNameplateEffect = player.nameplateEffect
          if (player.ownedItems?.length) blob._ownedItems = player.ownedItems
          if (player.tournamentTickets != null) blob._tournamentTickets = player.tournamentTickets
          if (player.promotions) blob._league = { joined: true, promotions: player.promotions, bestRank: player.league || 10, tournamentEntries: 0, tournamentWins: player.tournamentWins || 0, firstPlaceFinishes: player.firstPlaceFinishes || 0, totalWins: player.wins || 0, wasInTournament: false }
        }

        try {
          const raw = localStorage.getItem('arcade-stats')
          const local = raw ? JSON.parse(raw) : {}
          if (local._xp?.total && (!blob._xp || blob._xp.total < local._xp.total)) blob._xp = local._xp
          if (local._coins && (!blob._coins || blob._coins < local._coins)) blob._coins = local._coins
          if (local._activeTitle) blob._activeTitle = local._activeTitle
          if (local._activeNameplate) blob._activeNameplate = local._activeNameplate
          if (local._ownedItems?.length) {
            const merged = new Set([...(blob._ownedItems || []), ...local._ownedItems])
            blob._ownedItems = [...merged]
          }
          for (const key of Object.keys(local)) {
            if (!key.startsWith('_') && local[key] && typeof local[key] === 'object') {
              if (!blob[key] || (local[key].played || 0) > (blob[key].played || 0)) {
                blob[key] = local[key]
              }
            }
          }
          if (local._recent) blob._recent = local._recent
          if (local._favorites) blob._favorites = local._favorites
          if (local._dailyCompleted) blob._dailyCompleted = local._dailyCompleted
          if (local._dailyStreak) blob._dailyStreak = local._dailyStreak
          if (local._seenAchievements) blob._seenAchievements = local._seenAchievements
          if (local._highScores) blob._highScores = local._highScores
        } catch {}

        const hsKeys = { 'snake-high': 'snake', 'tetris-high': 'tetris', 'breakout-high': 'breakout', 'flappy-high': 'flappy', 'memory-best': 'memory', 'minesweeper-best': 'minesweeper', 'whack-best': 'whack' }
        const hs = blob._highScores || {}
        for (const [lsKey, blobKey] of Object.entries(hsKeys)) {
          if (!hs[blobKey]) {
            try {
              const val = localStorage.getItem(lsKey)
              if (val) {
                hs[blobKey] = blobKey === 'minesweeper' || blobKey === 'whack' ? JSON.parse(val) : parseInt(val) || 0
              }
            } catch {}
          }
        }
        if (Object.keys(hs).length > 0) blob._highScores = hs

        if (Object.keys(blob).length > 0 && uid === currentUserId) {
          await savePlayerStats(uid, blob)
        }
      }

      if (blob && uid === currentUserId) {
        if (!player) player = await getPlayer(uid).catch(() => null)
        if (player) {
          if ((player.xp || 0) > (blob._xp?.total || 0)) blob._xp = { total: player.xp }
          if ((player.coins || 0) !== (blob._coins || 0)) blob._coins = player.coins || 0
          if ((player.tournamentTickets || 0) !== (blob._tournamentTickets || 0)) blob._tournamentTickets = player.tournamentTickets || 0
        }
        sharedStats = blob
        notifyListeners()
      }
    } catch (e) {
      console.warn('Failed to load stats from Firestore:', e)
    } finally {
      loadPromise = null
    }
  })()
  return loadPromise
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!currentUserId) return
    const statsToSave = { ...sharedStats }
    import('./leagueService').then(({ savePlayerStats }) => {
      savePlayerStats(currentUserId, statsToSave).catch(e => {
        console.warn('Failed to save stats to Firestore:', e)
      })
    }).catch(() => {})
  }, 300)
}

function getEmptyGameStats() {
  return { played: 0, won: 0, bestStreak: 0 }
}

export const ALL_GAME_IDS = [
  'rps', 'ssg', 'gtn', 'gtn-hc', 'hol', 'dice', 'coin', 'memory', 'word', 'merge',
  'reaction', 'typing', 'simon', 'slots', 'blackjack', 'whack', 'snake', 'tetris',
  'breakout', 'flappy', 'minesweeper', 'lightsout', 'mastermind', 'dodge', 'mergeblitz', 'connect4',
  'sudoku', 'mathdash', 'wordle',
]

export const ACHIEVEMENTS = [
  // ── General ──
  { id: 'first-win', name: 'First Win', emoji: '🏆', desc: 'Win any game', category: 'general', rarity: 'common', check: s => s._xp?.total > 0, progress: s => ({ current: totalWon(s) >= 1 ? 1 : 0, max: 1 }) },
  { id: 'played-1', name: 'Getting Started', emoji: '🎮', desc: 'Play your first game', category: 'general', rarity: 'common', check: s => totalPlayed(s) >= 1, progress: s => ({ current: Math.min(totalPlayed(s), 1), max: 1 }) },
  { id: 'played-25', name: 'Casual Player', emoji: '🕹️', desc: 'Play 25 games', category: 'general', rarity: 'common', check: s => totalPlayed(s) >= 25, progress: s => ({ current: Math.min(totalPlayed(s), 25), max: 25 }) },
  { id: 'played-50', name: 'Regular', emoji: '🎯', desc: 'Play 50 games', category: 'general', rarity: 'uncommon', check: s => totalPlayed(s) >= 50, progress: s => ({ current: Math.min(totalPlayed(s), 50), max: 50 }) },
  { id: 'played-100', name: 'Dedicated', emoji: '🎪', desc: 'Play 100 games', category: 'general', rarity: 'uncommon', check: s => totalPlayed(s) >= 100, progress: s => ({ current: Math.min(totalPlayed(s), 100), max: 100 }) },
  { id: 'played-250', name: 'Addicted', emoji: '😵', desc: 'Play 250 games', category: 'general', rarity: 'rare', check: s => totalPlayed(s) >= 250, progress: s => ({ current: Math.min(totalPlayed(s), 250), max: 250 }) },
  { id: 'played-500', name: 'Arcade Rat', emoji: '🐀', desc: 'Play 500 games', category: 'general', rarity: 'epic', check: s => totalPlayed(s) >= 500, progress: s => ({ current: Math.min(totalPlayed(s), 500), max: 500 }) },
  { id: 'played-1000', name: 'Life Less Ordinary', emoji: '🎮', desc: 'Play 1,000 games', category: 'general', rarity: 'legendary', check: s => totalPlayed(s) >= 1000, progress: s => ({ current: Math.min(totalPlayed(s), 1000), max: 1000 }) },
  { id: 'won-10', name: 'Warming Up', emoji: '👍', desc: 'Win 10 games', category: 'general', rarity: 'common', check: s => totalWon(s) >= 10, progress: s => ({ current: Math.min(totalWon(s), 10), max: 10 }) },
  { id: 'won-50', name: 'Winner', emoji: '🥇', desc: 'Win 50 games', category: 'general', rarity: 'uncommon', check: s => totalWon(s) >= 50, progress: s => ({ current: Math.min(totalWon(s), 50), max: 50 }) },
  { id: 'won-100', name: 'Champion', emoji: '🏅', desc: 'Win 100 games', category: 'general', rarity: 'rare', check: s => totalWon(s) >= 100, progress: s => ({ current: Math.min(totalWon(s), 100), max: 100 }) },
  { id: 'won-250', name: 'Conqueror', emoji: '⚔️', desc: 'Win 250 games', category: 'general', rarity: 'epic', check: s => totalWon(s) >= 250, progress: s => ({ current: Math.min(totalWon(s), 250), max: 250 }) },
  { id: 'won-500', name: 'Undefeated', emoji: '👑', desc: 'Win 500 games', category: 'general', rarity: 'legendary', check: s => totalWon(s) >= 500, progress: s => ({ current: Math.min(totalWon(s), 500), max: 500 }) },
  { id: 'played-all', name: 'Completionist', emoji: '🎯', desc: 'Play all 29 games', category: 'general', rarity: 'rare', check: s => ALL_GAME_IDS.every(id => (s[id]?.played || 0) > 0), progress: s => ({ current: ALL_GAME_IDS.filter(id => (s[id]?.played || 0) > 0).length, max: ALL_GAME_IDS.length }) },
  { id: 'won-all', name: 'Grandmaster', emoji: '🧔', desc: 'Win at least one game of every type', category: 'general', rarity: 'legendary', check: s => ALL_GAME_IDS.every(id => (s[id]?.won || 0) > 0), progress: s => ({ current: ALL_GAME_IDS.filter(id => (s[id]?.won || 0) > 0).length, max: ALL_GAME_IDS.length }) },
  { id: 'favorite-5', name: 'Picky', emoji: '⭐', desc: 'Favorite 5 games', category: 'general', rarity: 'common', check: s => (s._favorites?.length || 0) >= 5, progress: s => ({ current: Math.min(s._favorites?.length || 0, 5), max: 5 }) },
  { id: 'favorite-10', name: 'Collector', emoji: '💫', desc: 'Favorite 10 games', category: 'general', rarity: 'uncommon', check: s => (s._favorites?.length || 0) >= 10, progress: s => ({ current: Math.min(s._favorites?.length || 0, 10), max: 10 }) },
  { id: 'daily', name: 'Daily Devotee', emoji: '📅', desc: 'Complete a daily challenge', category: 'general', rarity: 'common', check: s => s._dailyCompleted === getDailySeed(), progress: s => ({ current: s._dailyCompleted === getDailySeed() ? 1 : 0, max: 1 }) },
  { id: 'daily-7', name: 'Weeklong', emoji: '🗓️', desc: 'Complete 7 daily challenges', category: 'general', rarity: 'rare', check: s => (s._dailyStreak || 0) >= 7, progress: s => ({ current: Math.min(s._dailyStreak || 0, 7), max: 7 }) },

  // ── Streaks ──
  { id: 'streak-3', name: 'Hat Trick', emoji: '🎩', desc: '3 win streak in any game', category: 'streaks', rarity: 'common', check: s => maxStreak(s) >= 3, progress: s => ({ current: Math.min(maxStreak(s), 3), max: 3 }) },
  { id: 'streak-5', name: 'Hot Streak', emoji: '🔥', desc: '5 win streak in any game', category: 'streaks', rarity: 'common', check: s => maxStreak(s) >= 5, progress: s => ({ current: Math.min(maxStreak(s), 5), max: 5 }) },
  { id: 'streak-10', name: 'On Fire', emoji: '🔥', desc: '10 win streak in any game', category: 'streaks', rarity: 'uncommon', check: s => maxStreak(s) >= 10, progress: s => ({ current: Math.min(maxStreak(s), 10), max: 10 }) },
  { id: 'streak-25', name: 'Unstoppable', emoji: '🔥', desc: '25 win streak in any game', category: 'streaks', rarity: 'rare', check: s => maxStreak(s) >= 25, progress: s => ({ current: Math.min(maxStreak(s), 25), max: 25 }) },
  { id: 'streak-50', name: 'Legendary', emoji: '🏅', desc: '50 win streak in any game', category: 'streaks', rarity: 'epic', check: s => maxStreak(s) >= 50, progress: s => ({ current: Math.min(maxStreak(s), 50), max: 50 }) },
  { id: 'streak-100', name: 'Godlike', emoji: '⚡', desc: '100 win streak in any game', category: 'streaks', rarity: 'legendary', check: s => maxStreak(s) >= 100, progress: s => ({ current: Math.min(maxStreak(s), 100), max: 100 }) },
  { id: 'multi-streak-3', name: 'Well Rounded', emoji: '🌀', desc: 'Get a 3+ streak in 5 different games', category: 'streaks', rarity: 'uncommon', check: s => ALL_GAME_IDS.filter(id => (s[id]?.bestStreak || 0) >= 3).length >= 5, progress: s => ({ current: Math.min(ALL_GAME_IDS.filter(id => (s[id]?.bestStreak || 0) >= 3).length, 5), max: 5 }) },
  { id: 'multi-streak-5', name: 'Jack of All Trades', emoji: '🃏', desc: 'Get a 5+ streak in 5 different games', category: 'streaks', rarity: 'rare', check: s => ALL_GAME_IDS.filter(id => (s[id]?.bestStreak || 0) >= 5).length >= 5, progress: s => ({ current: Math.min(ALL_GAME_IDS.filter(id => (s[id]?.bestStreak || 0) >= 5).length, 5), max: 5 }) },

  // ── XP ──
  { id: 'xp-100', name: 'Rising Star', emoji: '⭐', desc: 'Earn 100 XP', category: 'xp', rarity: 'common', check: s => (s._xp?.total || 0) >= 100, progress: s => ({ current: Math.min(s._xp?.total || 0, 100), max: 100 }) },
  { id: 'xp-500', name: 'Experienced', emoji: '💫', desc: 'Earn 500 XP', category: 'xp', rarity: 'common', check: s => (s._xp?.total || 0) >= 500, progress: s => ({ current: Math.min(s._xp?.total || 0, 500), max: 500 }) },
  { id: 'xp-1000', name: 'Power Player', emoji: '💫', desc: 'Earn 1,000 XP', category: 'xp', rarity: 'uncommon', check: s => (s._xp?.total || 0) >= 1000, progress: s => ({ current: Math.min(s._xp?.total || 0, 1000), max: 1000 }) },
  { id: 'xp-2500', name: 'Veteran', emoji: '🌟', desc: 'Earn 2,500 XP', category: 'xp', rarity: 'uncommon', check: s => (s._xp?.total || 0) >= 2500, progress: s => ({ current: Math.min(s._xp?.total || 0, 2500), max: 2500 }) },
  { id: 'xp-5000', name: 'XP Master', emoji: '🌟', desc: 'Earn 5,000 XP', category: 'xp', rarity: 'rare', check: s => (s._xp?.total || 0) >= 5000, progress: s => ({ current: Math.min(s._xp?.total || 0, 5000), max: 5000 }) },
  { id: 'xp-10000', name: 'XP Legend', emoji: '✨', desc: 'Earn 10,000 XP', category: 'xp', rarity: 'epic', check: s => (s._xp?.total || 0) >= 10000, progress: s => ({ current: Math.min(s._xp?.total || 0, 10000), max: 10000 }) },
  { id: 'xp-25000', name: 'XP God', emoji: '💎', desc: 'Earn 25,000 XP', category: 'xp', rarity: 'legendary', check: s => (s._xp?.total || 0) >= 25000, progress: s => ({ current: Math.min(s._xp?.total || 0, 25000), max: 25000 }) },

  // ── League & Tournament ──
  { id: 'league-join', name: 'League Rookie', emoji: '⚔️', desc: 'Join a league for the first time', category: 'league', rarity: 'common', check: s => s._league?.joined === true, progress: s => ({ current: s._league?.joined ? 1 : 0, max: 1 }) },
  { id: 'promo-1', name: 'Moving Up', emoji: '⬆️', desc: 'Get promoted once', category: 'league', rarity: 'common', check: s => (s._league?.promotions || 0) >= 1, progress: s => ({ current: Math.min(s._league?.promotions || 0, 1), max: 1 }) },
  { id: 'promo-5', name: 'Climber', emoji: '🏔️', desc: 'Get promoted 5 times', category: 'league', rarity: 'uncommon', check: s => (s._league?.promotions || 0) >= 5, progress: s => ({ current: Math.min(s._league?.promotions || 0, 5), max: 5 }) },
  { id: 'promo-10', name: 'Ascender', emoji: '🚀', desc: 'Get promoted 10 times', category: 'league', rarity: 'rare', check: s => (s._league?.promotions || 0) >= 10, progress: s => ({ current: Math.min(s._league?.promotions || 0, 10), max: 10 }) },
  { id: 'promo-25', name: 'Relentless', emoji: '💫', desc: 'Get promoted 25 times', category: 'league', rarity: 'epic', check: s => (s._league?.promotions || 0) >= 25, progress: s => ({ current: Math.min(s._league?.promotions || 0, 25), max: 25 }) },
  { id: 'promo-50', name: 'Promotion Machine', emoji: '🏭', desc: 'Get promoted 50 times', category: 'league', rarity: 'legendary', check: s => (s._league?.promotions || 0) >= 50, progress: s => ({ current: Math.min(s._league?.promotions || 0, 50), max: 50 }) },
  { id: 'reach-bird', name: 'Free Bird', emoji: '🐦', desc: 'Reach Bird rank', category: 'league', rarity: 'common', check: s => (s._league?.bestRank || 10) <= 8, progress: s => ({ current: (s._league?.bestRank || 10) <= 8 ? 1 : 0, max: 1 }) },
  { id: 'reach-lion', name: 'Lion Heart', emoji: '🦁', desc: 'Reach Lion rank', category: 'league', rarity: 'common', check: s => (s._league?.bestRank || 10) <= 7, progress: s => ({ current: (s._league?.bestRank || 10) <= 7 ? 1 : 0, max: 1 }) },
  { id: 'reach-dino', name: 'Dino Rider', emoji: '🦕', desc: 'Reach Dinosaur rank', category: 'league', rarity: 'uncommon', check: s => (s._league?.bestRank || 10) <= 6, progress: s => ({ current: (s._league?.bestRank || 10) <= 6 ? 1 : 0, max: 1 }) },
  { id: 'reach-monster', name: 'Monster Mash', emoji: '👹', desc: 'Reach Monster rank', category: 'league', rarity: 'uncommon', check: s => (s._league?.bestRank || 10) <= 5, progress: s => ({ current: (s._league?.bestRank || 10) <= 5 ? 1 : 0, max: 1 }) },
  { id: 'reach-thunderbird', name: 'Thunderstruck', emoji: '🪶', desc: 'Reach Thunderbird rank', category: 'league', rarity: 'rare', check: s => (s._league?.bestRank || 10) <= 4, progress: s => ({ current: (s._league?.bestRank || 10) <= 4 ? 1 : 0, max: 1 }) },
  { id: 'reach-cosmic', name: 'Cosmic Mind', emoji: '🌌', desc: 'Reach Cosmic rank', category: 'league', rarity: 'epic', check: s => (s._league?.bestRank || 10) <= 3, progress: s => ({ current: (s._league?.bestRank || 10) <= 3 ? 1 : 0, max: 1 }) },
  { id: 'reach-phoenix', name: 'Rise From Ashes', emoji: '🔥', desc: 'Reach Phoenix rank', category: 'league', rarity: 'epic', check: s => (s._league?.bestRank || 10) <= 2, progress: s => ({ current: (s._league?.bestRank || 10) <= 2 ? 1 : 0, max: 1 }) },
  { id: 'reach-god', name: 'Ascended', emoji: '⚡', desc: 'Reach God rank', category: 'league', rarity: 'legendary', check: s => (s._league?.bestRank || 10) <= 1, progress: s => ({ current: (s._league?.bestRank || 10) <= 1 ? 1 : 0, max: 1 }) },
  { id: 'tournament-entry', name: 'Tournament Bound', emoji: '🏟️', desc: 'Enter a tournament', category: 'league', rarity: 'common', check: s => (s._league?.tournamentEntries || 0) >= 1, progress: s => ({ current: Math.min(s._league?.tournamentEntries || 0, 1), max: 1 }) },
  { id: 'tournament-win', name: 'Tournament Victor', emoji: '🏆', desc: 'Win a tournament', category: 'league', rarity: 'uncommon', check: s => (s._league?.tournamentWins || 0) >= 1, progress: s => ({ current: Math.min(s._league?.tournamentWins || 0, 1), max: 1 }) },
  { id: 'tournament-3wins', name: 'Tournament Legend', emoji: '🌟', desc: 'Win 3 tournaments', category: 'league', rarity: 'rare', check: s => (s._league?.tournamentWins || 0) >= 3, progress: s => ({ current: Math.min(s._league?.tournamentWins || 0, 3), max: 3 }) },
  { id: 'tournament-5wins', name: 'Tournament Dynasty', emoji: '🏰', desc: 'Win 5 tournaments', category: 'league', rarity: 'legendary', check: s => (s._league?.tournamentWins || 0) >= 5, progress: s => ({ current: Math.min(s._league?.tournamentWins || 0, 5), max: 5 }) },
  { id: 'first-place', name: 'First Place', emoji: '🥇', desc: 'Finish 1st in a tournament', category: 'league', rarity: 'uncommon', check: s => (s._league?.firstPlaceFinishes || 0) >= 1, progress: s => ({ current: Math.min(s._league?.firstPlaceFinishes || 0, 1), max: 1 }) },
  { id: 'first-place-3', name: 'Podium Regular', emoji: '🏆', desc: 'Finish 1st 3 times', category: 'league', rarity: 'rare', check: s => (s._league?.firstPlaceFinishes || 0) >= 3, progress: s => ({ current: Math.min(s._league?.firstPlaceFinishes || 0, 3), max: 3 }) },
  { id: 'league-wins-10', name: 'League Prospect', emoji: '⚔️', desc: 'Win 10 league games', category: 'league', rarity: 'common', check: s => (s._league?.totalWins || 0) >= 10, progress: s => ({ current: Math.min(s._league?.totalWins || 0, 10), max: 10 }) },
  { id: 'league-wins-50', name: 'League Warrior', emoji: '⚔️', desc: 'Win 50 league games', category: 'league', rarity: 'uncommon', check: s => (s._league?.totalWins || 0) >= 50, progress: s => ({ current: Math.min(s._league?.totalWins || 0, 50), max: 50 }) },
  { id: 'league-wins-100', name: 'League Master', emoji: '🏅', desc: 'Win 100 league games', category: 'league', rarity: 'epic', check: s => (s._league?.totalWins || 0) >= 100, progress: s => ({ current: Math.min(s._league?.totalWins || 0, 100), max: 100 }) },

  // ── Per-Game ──
  { id: 'rps-10', name: 'Rock Champion', emoji: '✊', desc: 'Win 10 Rock Paper Scissors games', category: 'games', rarity: 'common', check: s => (s.rps?.won || 0) >= 10, progress: s => ({ current: Math.min(s.rps?.won || 0, 10), max: 10 }) },
  { id: 'rps-50', name: 'RPS Master', emoji: '✊', desc: 'Win 50 Rock Paper Scissors games', category: 'games', rarity: 'uncommon', check: s => (s.rps?.won || 0) >= 50, progress: s => ({ current: Math.min(s.rps?.won || 0, 50), max: 50 }) },
  { id: 'slots-10', name: 'Lucky Streak', emoji: '🎰', desc: 'Win 10 Slots games', category: 'games', rarity: 'common', check: s => (s.slots?.won || 0) >= 10, progress: s => ({ current: Math.min(s.slots?.won || 0, 10), max: 10 }) },
  { id: 'slots-50', name: 'Jackpot King', emoji: '🎰', desc: 'Win 50 Slots games', category: 'games', rarity: 'uncommon', check: s => (s.slots?.won || 0) >= 50, progress: s => ({ current: Math.min(s.slots?.won || 0, 50), max: 50 }) },
  { id: 'blackjack-10', name: 'Card Sharp', emoji: '🃏', desc: 'Win 10 Blackjack games', category: 'games', rarity: 'common', check: s => (s.blackjack?.won || 0) >= 10, progress: s => ({ current: Math.min(s.blackjack?.won || 0, 10), max: 10 }) },
  { id: 'blackjack-50', name: 'High Roller', emoji: '🃏', desc: 'Win 50 Blackjack games', category: 'games', rarity: 'uncommon', check: s => (s.blackjack?.won || 0) >= 50, progress: s => ({ current: Math.min(s.blackjack?.won || 0, 50), max: 50 }) },
  { id: 'snake-10', name: 'Serpent Slayer', emoji: '🐍', desc: 'Win 10 Snake games', category: 'games', rarity: 'common', check: s => (s.snake?.won || 0) >= 10, progress: s => ({ current: Math.min(s.snake?.won || 0, 10), max: 10 }) },
  { id: 'snake-50', name: 'Snake Whisperer', emoji: '🐍', desc: 'Win 50 Snake games', category: 'games', rarity: 'uncommon', check: s => (s.snake?.won || 0) >= 50, progress: s => ({ current: Math.min(s.snake?.won || 0, 50), max: 50 }) },
  { id: 'tetris-10', name: 'Block Builder', emoji: '🧱', desc: 'Win 10 Tetris games', category: 'games', rarity: 'common', check: s => (s.tetris?.won || 0) >= 10, progress: s => ({ current: Math.min(s.tetris?.won || 0, 10), max: 10 }) },
  { id: 'tetris-50', name: 'Tetris Titan', emoji: '🧱', desc: 'Win 50 Tetris games', category: 'games', rarity: 'uncommon', check: s => (s.tetris?.won || 0) >= 50, progress: s => ({ current: Math.min(s.tetris?.won || 0, 50), max: 50 }) },
  { id: 'flappy-10', name: 'Bird Watcher', emoji: '🐦', desc: 'Win 10 Flappy Bird games', category: 'games', rarity: 'common', check: s => (s.flappy?.won || 0) >= 10, progress: s => ({ current: Math.min(s.flappy?.won || 0, 10), max: 10 }) },
  { id: 'flappy-50', name: 'Sky Master', emoji: '🐦', desc: 'Win 50 Flappy Bird games', category: 'games', rarity: 'uncommon', check: s => (s.flappy?.won || 0) >= 50, progress: s => ({ current: Math.min(s.flappy?.won || 0, 50), max: 50 }) },
  { id: 'breakout-10', name: 'Brick Breaker', emoji: '🏓', desc: 'Win 10 Breakout games', category: 'games', rarity: 'common', check: s => (s.breakout?.won || 0) >= 10, progress: s => ({ current: Math.min(s.breakout?.won || 0, 10), max: 10 }) },
  { id: 'breakout-50', name: 'Smash King', emoji: '🏓', desc: 'Win 50 Breakout games', category: 'games', rarity: 'uncommon', check: s => (s.breakout?.won || 0) >= 50, progress: s => ({ current: Math.min(s.breakout?.won || 0, 50), max: 50 }) },
  { id: 'minesweeper-10', name: 'Mine Detector', emoji: '💣', desc: 'Win 10 Minesweeper games', category: 'games', rarity: 'common', check: s => (s.minesweeper?.won || 0) >= 10, progress: s => ({ current: Math.min(s.minesweeper?.won || 0, 10), max: 10 }) },
  { id: 'minesweeper-50', name: 'Bomb Squad', emoji: '💣', desc: 'Win 50 Minesweeper games', category: 'games', rarity: 'uncommon', check: s => (s.minesweeper?.won || 0) >= 50, progress: s => ({ current: Math.min(s.minesweeper?.won || 0, 50), max: 50 }) },
  { id: 'memory-10', name: 'Photographic Memory', emoji: '🧠', desc: 'Win 10 Memory Match games', category: 'games', rarity: 'common', check: s => (s.memory?.won || 0) >= 10, progress: s => ({ current: Math.min(s.memory?.won || 0, 10), max: 10 }) },
  { id: 'memory-50', name: 'Eidetic', emoji: '🧠', desc: 'Win 50 Memory Match games', category: 'games', rarity: 'uncommon', check: s => (s.memory?.won || 0) >= 50, progress: s => ({ current: Math.min(s.memory?.won || 0, 50), max: 50 }) },
  { id: 'simon-10', name: 'Musician', emoji: '🎵', desc: 'Win 10 Simon Says games', category: 'games', rarity: 'common', check: s => (s.simon?.won || 0) >= 10, progress: s => ({ current: Math.min(s.simon?.won || 0, 10), max: 10 }) },
  { id: 'simon-50', name: 'Maestro', emoji: '🎵', desc: 'Win 50 Simon Says games', category: 'games', rarity: 'uncommon', check: s => (s.simon?.won || 0) >= 50, progress: s => ({ current: Math.min(s.simon?.won || 0, 50), max: 50 }) },
  { id: 'reaction-10', name: 'Quick Draw', emoji: '⚡', desc: 'Win 10 Reaction Time games', category: 'games', rarity: 'common', check: s => (s.reaction?.won || 0) >= 10, progress: s => ({ current: Math.min(s.reaction?.won || 0, 10), max: 10 }) },
  { id: 'reaction-50', name: 'Lightning Fingers', emoji: '⚡', desc: 'Win 50 Reaction Time games', category: 'games', rarity: 'uncommon', check: s => (s.reaction?.won || 0) >= 50, progress: s => ({ current: Math.min(s.reaction?.won || 0, 50), max: 50 }) },
  { id: 'typing-10', name: 'Typist', emoji: '⌨️', desc: 'Win 10 Typing Speed games', category: 'games', rarity: 'common', check: s => (s.typing?.won || 0) >= 10, progress: s => ({ current: Math.min(s.typing?.won || 0, 10), max: 10 }) },
  { id: 'typing-50', name: 'Speed Demon', emoji: '⌨️', desc: 'Win 50 Typing Speed games', category: 'games', rarity: 'uncommon', check: s => (s.typing?.won || 0) >= 50, progress: s => ({ current: Math.min(s.typing?.won || 0, 50), max: 50 }) },
  { id: 'whack-10', name: 'Mole Bopper', emoji: '🔨', desc: 'Win 10 Whack-a-Mole games', category: 'games', rarity: 'common', check: s => (s.whack?.won || 0) >= 10, progress: s => ({ current: Math.min(s.whack?.won || 0, 10), max: 10 }) },
  { id: 'whack-50', name: 'Exterminator', emoji: '🔨', desc: 'Win 50 Whack-a-Mole games', category: 'games', rarity: 'uncommon', check: s => (s.whack?.won || 0) >= 50, progress: s => ({ current: Math.min(s.whack?.won || 0, 50), max: 50 }) },
  { id: 'word-10', name: 'Wordsmith', emoji: '📚', desc: 'Win 10 Word Scramble games', category: 'games', rarity: 'common', check: s => (s.word?.won || 0) >= 10, progress: s => ({ current: Math.min(s.word?.won || 0, 10), max: 10 }) },
  { id: 'word-50', name: 'Lexicon Legend', emoji: '📚', desc: 'Win 50 Word Scramble games', category: 'games', rarity: 'uncommon', check: s => (s.word?.won || 0) >= 50, progress: s => ({ current: Math.min(s.word?.won || 0, 50), max: 50 }) },
  { id: 'merge-10', name: 'Number Cruncher', emoji: '🔢', desc: 'Win 10 Number Merge games', category: 'games', rarity: 'common', check: s => (s.merge?.won || 0) >= 10, progress: s => ({ current: Math.min(s.merge?.won || 0, 10), max: 10 }) },
  { id: 'merge-50', name: 'Merge Master', emoji: '🔢', desc: 'Win 50 Number Merge games', category: 'games', rarity: 'uncommon', check: s => (s.merge?.won || 0) >= 50, progress: s => ({ current: Math.min(s.merge?.won || 0, 50), max: 50 }) },
  { id: 'gtn-10', name: 'Psychic', emoji: '🔮', desc: 'Win 10 Guess the Number games', category: 'games', rarity: 'common', check: s => (s.gtn?.won || 0) >= 10, progress: s => ({ current: Math.min(s.gtn?.won || 0, 10), max: 10 }) },
  { id: 'gtn-50', name: 'Mind Reader', emoji: '🔮', desc: 'Win 50 Guess the Number games', category: 'games', rarity: 'uncommon', check: s => (s.gtn?.won || 0) >= 50, progress: s => ({ current: Math.min(s.gtn?.won || 0, 50), max: 50 }) },
  { id: 'hol-10', name: 'Gambler', emoji: '🃏', desc: 'Win 10 Higher or Lower games', category: 'games', rarity: 'common', check: s => (s.hol?.won || 0) >= 10, progress: s => ({ current: Math.min(s.hol?.won || 0, 10), max: 10 }) },
  { id: 'hol-50', name: 'Odds Master', emoji: '🃏', desc: 'Win 50 Higher or Lower games', category: 'games', rarity: 'uncommon', check: s => (s.hol?.won || 0) >= 50, progress: s => ({ current: Math.min(s.hol?.won || 0, 50), max: 50 }) },
  { id: 'coin-10', name: 'Flipping Pro', emoji: '🪙', desc: 'Win 10 Coin Flip Streak games', category: 'games', rarity: 'common', check: s => (s.coin?.won || 0) >= 10, progress: s => ({ current: Math.min(s.coin?.won || 0, 10), max: 10 }) },
  { id: 'coin-50', name: 'Coin King', emoji: '🪙', desc: 'Win 50 Coin Flip Streak games', category: 'games', rarity: 'uncommon', check: s => (s.coin?.won || 0) >= 50, progress: s => ({ current: Math.min(s.coin?.won || 0, 50), max: 50 }) },
  { id: 'dice-10', name: 'Dice Roller', emoji: '🎲', desc: 'Win 10 Dice Roll games', category: 'games', rarity: 'common', check: s => (s.dice?.won || 0) >= 10, progress: s => ({ current: Math.min(s.dice?.won || 0, 10), max: 10 }) },
  { id: 'dice-50', name: 'Dice Wizard', emoji: '🎲', desc: 'Win 50 Dice Roll games', category: 'games', rarity: 'uncommon', check: s => (s.dice?.won || 0) >= 50, progress: s => ({ current: Math.min(s.dice?.won || 0, 50), max: 50 }) },
  { id: 'ssg-10', name: 'Deal Maker', emoji: '🤝', desc: 'Win 10 Split Steal Give Away games', category: 'games', rarity: 'common', check: s => (s.ssg?.won || 0) >= 10, progress: s => ({ current: Math.min(s.ssg?.won || 0, 10), max: 10 }) },
  { id: 'ssg-50', name: 'Split Master', emoji: '🤝', desc: 'Win 50 Split Steal Give Away games', category: 'games', rarity: 'uncommon', check: s => (s.ssg?.won || 0) >= 50, progress: s => ({ current: Math.min(s.ssg?.won || 0, 50), max: 50 }) },
  { id: 'gtn-hc-10', name: 'Hot Streak', emoji: '🌡️', desc: 'Win 10 Hot or Cold games', category: 'games', rarity: 'common', check: s => (s['gtn-hc']?.won || 0) >= 10, progress: s => ({ current: Math.min(s['gtn-hc']?.won || 0, 10), max: 10 }) },
  { id: 'gtn-hc-50', name: 'Thermal Expert', emoji: '🌡️', desc: 'Win 50 Hot or Cold games', category: 'games', rarity: 'uncommon', check: s => (s['gtn-hc']?.won || 0) >= 50, progress: s => ({ current: Math.min(s['gtn-hc']?.won || 0, 50), max: 50 }) },
  { id: 'lightsout-10', name: 'Light Switcher', emoji: '💡', desc: 'Win 10 Lights Out games', category: 'games', rarity: 'common', check: s => (s.lightsout?.won || 0) >= 10, progress: s => ({ current: Math.min(s.lightsout?.won || 0, 10), max: 10 }) },
  { id: 'lightsout-50', name: 'Lights Master', emoji: '💡', desc: 'Win 50 Lights Out games', category: 'games', rarity: 'uncommon', check: s => (s.lightsout?.won || 0) >= 50, progress: s => ({ current: Math.min(s.lightsout?.won || 0, 50), max: 50 }) },
  { id: 'mastermind-10', name: 'Code Breaker', emoji: '🧠', desc: 'Win 10 Mastermind games', category: 'games', rarity: 'common', check: s => (s.mastermind?.won || 0) >= 10, progress: s => ({ current: Math.min(s.mastermind?.won || 0, 10), max: 10 }) },
  { id: 'mastermind-50', name: 'Mastermind', emoji: '🧠', desc: 'Win 50 Mastermind games', category: 'games', rarity: 'uncommon', check: s => (s.mastermind?.won || 0) >= 50, progress: s => ({ current: Math.min(s.mastermind?.won || 0, 50), max: 50 }) },
  { id: 'dodge-10', name: 'Dodger', emoji: '🎮', desc: 'Survive 10 Dodge games', category: 'games', rarity: 'common', check: s => (s.dodge?.won || 0) >= 10, progress: s => ({ current: Math.min(s.dodge?.won || 0, 10), max: 10 }) },
  { id: 'dodge-50', name: 'Untouchable', emoji: '🎮', desc: 'Survive 50 Dodge games', category: 'games', rarity: 'uncommon', check: s => (s.dodge?.won || 0) >= 50, progress: s => ({ current: Math.min(s.dodge?.won || 0, 50), max: 50 }) },
  { id: 'mergeblitz-10', name: 'Blitz Melder', emoji: '⚡', desc: 'Win 10 Merge Blitz games', category: 'games', rarity: 'common', check: s => (s.mergeblitz?.won || 0) >= 10, progress: s => ({ current: Math.min(s.mergeblitz?.won || 0, 10), max: 10 }) },
  { id: 'mergeblitz-50', name: 'Combo King', emoji: '⚡', desc: 'Win 50 Merge Blitz games', category: 'games', rarity: 'uncommon', check: s => (s.mergeblitz?.won || 0) >= 50, progress: s => ({ current: Math.min(s.mergeblitz?.won || 0, 50), max: 50 }) },
  { id: 'connect4-10', name: 'Connect Pro', emoji: '🔴', desc: 'Win 10 Connect Four games', category: 'games', rarity: 'common', check: s => (s.connect4?.won || 0) >= 10, progress: s => ({ current: Math.min(s.connect4?.won || 0, 10), max: 10 }) },
  { id: 'connect4-50', name: 'Four in a Row', emoji: '🔴', desc: 'Win 50 Connect Four games', category: 'games', rarity: 'uncommon', check: s => (s.connect4?.won || 0) >= 50, progress: s => ({ current: Math.min(s.connect4?.won || 0, 50), max: 50 }) },
  { id: 'sudoku-10', name: 'Number Cruncher', emoji: '🔢', desc: 'Win 10 Sudoku games', category: 'games', rarity: 'common', check: s => (s.sudoku?.won || 0) >= 10, progress: s => ({ current: Math.min(s.sudoku?.won || 0, 10), max: 10 }) },
  { id: 'sudoku-50', name: 'Grid Master', emoji: '🧩', desc: 'Win 50 Sudoku games', category: 'games', rarity: 'uncommon', check: s => (s.sudoku?.won || 0) >= 50, progress: s => ({ current: Math.min(s.sudoku?.won || 0, 50), max: 50 }) },
  { id: 'mathdash-10', name: 'Math Whiz', emoji: '➕', desc: 'Win 10 Math Dash games', category: 'games', rarity: 'common', check: s => (s.mathdash?.won || 0) >= 10, progress: s => ({ current: Math.min(s.mathdash?.won || 0, 10), max: 10 }) },
  { id: 'mathdash-50', name: 'Equation Engine', emoji: '🧮', desc: 'Win 50 Math Dash games', category: 'games', rarity: 'uncommon', check: s => (s.mathdash?.won || 0) >= 50, progress: s => ({ current: Math.min(s.mathdash?.won || 0, 50), max: 50 }) },
  { id: 'wordle-10', name: 'Word Smith', emoji: '📝', desc: 'Win 10 Wordle games', category: 'games', rarity: 'common', check: s => (s.wordle?.won || 0) >= 10, progress: s => ({ current: Math.min(s.wordle?.won || 0, 10), max: 10 }) },
  { id: 'wordle-50', name: 'Vocabulary King', emoji: '👑', desc: 'Win 50 Wordle games', category: 'games', rarity: 'uncommon', check: s => (s.wordle?.won || 0) >= 50, progress: s => ({ current: Math.min(s.wordle?.won || 0, 50), max: 50 }) },
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
  const [stats, setStats] = useState(() => ({ ...sharedStats }))
  const gameIdRef = useRef(gameId)
  gameIdRef.current = gameId

  useEffect(() => {
    function listener(newStats) {
      setStats({ ...newStats })
    }
    statsListeners.add(listener)
    if (currentUserId) {
      setStats({ ...sharedStats })
    } else {
      setStats({})
    }
    return () => { statsListeners.delete(listener) }
  }, [])

  const gameStats = currentUserId ? (stats[gameId] || getEmptyGameStats()) : getEmptyGameStats()

  const recordGame = useCallback((won, streak = 0) => {
    const gid = gameIdRef.current
    const isScoreBased = SCORE_BASED_GAMES.includes(gid)
    let score = 0
    let isWin = false
    if (isScoreBased) {
      if (typeof won === 'number' && won > 0) { score = won; isWin = true }
      else if (typeof streak === 'number' && streak > 0) { score = streak; isWin = true }
      else { score = typeof won === 'number' ? won : 0; isWin = false }
    } else {
      isWin = !!won
    }
    try { window.dispatchEvent(new CustomEvent('arcade-win', { detail: { gameId: gid, won: isWin, score } })) } catch {}
    try { window.dispatchEvent(new CustomEvent('arcade-game-complete', { detail: { gameId: gid, won: isWin } })) } catch {}
    try {
      const dailyGame = getDailyGame(ALL_GAME_IDS)
      if (gid === dailyGame.gameId) {
        const submitScore = score || (isWin ? 1 : 0)
        import('./socialService').then(({ submitDailyScore }) => {
          submitDailyScore(gid, submitScore, Date.now()).catch(() => {})
        }).catch(() => {})
      }
    } catch {}
    if (!currentUserId) return
    const current = sharedStats[gid] || getEmptyGameStats()
    const xpEarned = isScoreBased ? (isWin ? Math.round(score * (GAME_XP[gid] || 20) / 20) : 0) : (isWin ? 10 + Math.min(streak, 10) * 2 : 3)
    const prevXp = sharedStats._xp?.total || 0
    const recent = sharedStats._recent || []
    const newRecent = [gid, ...recent.filter(id => id !== gid)].slice(0, 8)
    sharedStats = {
      ...sharedStats,
      [gid]: {
        played: current.played + 1,
        won: current.won + (isWin ? 1 : 0),
        bestStreak: Math.max(current.bestStreak, streak),
      },
      _xp: { total: prevXp + xpEarned },
      _recent: newRecent,
    }
    scheduleSave()
    notifyListeners()
  }, [])

  const clearStats = useCallback(() => {
    sharedStats = {}
    scheduleSave()
    notifyListeners()
  }, [])

  const setFavorite = useCallback((id, val) => {
    if (!currentUserId) return
    const favs = sharedStats._favorites || []
    const isFav = favs.includes(id)
    const shouldAdd = val !== undefined ? val : !isFav
    sharedStats = {
      ...sharedStats,
      _favorites: shouldAdd ? [...new Set([...favs, id])] : favs.filter(f => f !== id),
    }
    scheduleSave()
    notifyListeners()
  }, [])

  const isFavorite = useCallback((id) => {
    return (stats._favorites || []).includes(id)
  }, [stats._favorites])

  const markDailyCompleted = useCallback(() => {
    if (!currentUserId) return
    const today = getDailySeed()
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() })()
    const prevStreak = sharedStats._dailyStreak || 0
    const prevCompleted = sharedStats._dailyCompleted
    let newStreak = 1
    if (prevCompleted === yesterday && prevStreak > 0) {
      newStreak = prevStreak + 1
    } else if (prevCompleted === today) {
      newStreak = prevStreak
    }
    sharedStats = { ...sharedStats, _dailyCompleted: today, _dailyStreak: newStreak }
    scheduleSave()
    notifyListeners()
  }, [])

  const allStats = useMemo(() => currentUserId ? stats : {}, [stats])
  const xp = currentUserId ? (stats._xp?.total || 0) : 0
  const recent = useMemo(() => currentUserId ? (stats._recent || []) : [], [stats])
  const favorites = useMemo(() => currentUserId ? (stats._favorites || []) : [], [stats])
  const coins = currentUserId ? (stats._coins || 0) : 0
  const ownedItems = useMemo(() => currentUserId ? (stats._ownedItems || []) : [], [stats])
  const tournamentTickets = currentUserId ? (stats._tournamentTickets || 0) : 0
  const activeTitle = currentUserId ? (stats._activeTitle || null) : null
  const activeNameplate = currentUserId ? (stats._activeNameplate || null) : null
  const activeNameplateEffect = currentUserId ? (stats._activeNameplateEffect || null) : null
  const earnedAchievements = useMemo(() => currentUserId ? ACHIEVEMENTS.filter(a => a.check(stats)).map(a => a.id) : [], [stats])
  const newAchievements = useMemo(() => currentUserId ? earnedAchievements.filter(id => !(stats._seenAchievements || []).includes(id)) : [], [earnedAchievements, stats._seenAchievements])

  const syncLeagueData = useCallback((playerData) => {
    if (!currentUserId) return
    const league = {
      joined: true,
      promotions: playerData.promotions || 0,
      bestRank: Math.min(sharedStats._league?.bestRank || 10, playerData.league || 10),
      tournamentEntries: (sharedStats._league?.tournamentEntries || 0) + (playerData.league === 2 && !sharedStats._league?.wasInTournament ? 1 : 0),
      tournamentWins: playerData.tournamentWins || 0,
      firstPlaceFinishes: playerData.firstPlaceFinishes || 0,
      totalWins: playerData.wins || 0,
      wasInTournament: playerData.league === 2,
    }
    sharedStats = { ...sharedStats, _league: league }
    if (playerData.coins != null) {
      sharedStats._coins = playerData.coins
    }
    if (playerData.xp != null) {
      sharedStats._xp = { total: playerData.xp }
    }
    scheduleSave()
    notifyListeners()
  }, [])

  const markAchievementsSeen = useCallback(() => {
    if (!currentUserId) return
    sharedStats = { ...sharedStats, _seenAchievements: earnedAchievements }
    scheduleSave()
    notifyListeners()
  }, [earnedAchievements])

  const addCoins = useCallback((amount) => {
    if (!currentUserId || amount <= 0) return
    sharedStats = { ...sharedStats, _coins: (sharedStats._coins || 0) + amount }
    scheduleSave()
    notifyListeners()
  }, [])

  const spendCoins = useCallback((amount) => {
    if (!currentUserId) return
    const current = sharedStats._coins || 0
    if (current < amount) return
    sharedStats = { ...sharedStats, _coins: current - amount }
    scheduleSave()
    notifyListeners()
  }, [])

  const purchaseItem = useCallback((itemId, price) => {
    if (!currentUserId) return
    const current = sharedStats._coins || 0
    if (current < price) return
    if (itemId === 'ticket-tournament') {
      sharedStats = {
        ...sharedStats,
        _coins: current - price,
        _tournamentTickets: (sharedStats._tournamentTickets || 0) + 1,
      }
    } else {
      if ((sharedStats._ownedItems || []).includes(itemId)) return
      sharedStats = {
        ...sharedStats,
        _coins: current - price,
        _ownedItems: [...(sharedStats._ownedItems || []), itemId],
      }
    }
    scheduleSave()
    notifyListeners()
  }, [])

  const equipTitle = useCallback((titleId) => {
    if (!currentUserId) return
    sharedStats = { ...sharedStats, _activeTitle: titleId }
    scheduleSave()
    notifyListeners()
  }, [])

  const equipNameplate = useCallback((nameplateId) => {
    if (!currentUserId) return
    sharedStats = { ...sharedStats, _activeNameplate: nameplateId }
    scheduleSave()
    notifyListeners()
  }, [])

  const equipNameplateEffect = useCallback((nameplateId) => {
    if (!currentUserId) return
    sharedStats = { ...sharedStats, _activeNameplateEffect: nameplateId }
    scheduleSave()
    notifyListeners()
  }, [])

  const checkAchievementCoins = useCallback((prevSeenIds, newSeenIds) => {
    let totalReward = 0
    for (const id of newSeenIds) {
      if (!prevSeenIds.includes(id)) {
        totalReward += ACHIEVEMENT_COIN_REWARDS[id] || 0
      }
    }
    return totalReward
  }, [])

  const getHighScore = useCallback((key) => {
    if (!currentUserId) return 0
    return sharedStats._highScores?.[key] || 0
  }, [])

  const setHighScore = useCallback((key, value) => {
    if (!currentUserId) return
    const hs = sharedStats._highScores || {}
    sharedStats = {
      ...sharedStats,
      _highScores: { ...hs, [key]: value },
    }
    scheduleSave()
    notifyListeners()
  }, [])

  const totalPlayedCount = useMemo(() => currentUserId ? totalPlayed(stats) : 0, [stats])
  const totalWonCount = useMemo(() => currentUserId ? totalWon(stats) : 0, [stats])

  return {
    gameStats, recordGame, clearStats, allStats,
    xp, recent, favorites, setFavorite, isFavorite,
    earnedAchievements, newAchievements, markAchievementsSeen,
    markDailyCompleted, totalPlayedCount, totalWonCount, syncLeagueData,
    coins, ownedItems, tournamentTickets, activeTitle, activeNameplate, activeNameplateEffect,
    addCoins, spendCoins, purchaseItem, equipTitle, equipNameplate, equipNameplateEffect,
    checkAchievementCoins,
    getHighScore, setHighScore,
  }
}
