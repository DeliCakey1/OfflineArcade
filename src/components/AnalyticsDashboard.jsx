import { useMemo } from 'react'
import { ALL_GAME_IDS, getDailyGame } from '../useStats'

const GAME_NAMES = {
  rps: 'Rock Paper Scissors', ssg: 'Split Steal Give Away', gtn: 'Guess The Number',
  'gtn-hc': 'Hot or Cold', hol: 'Higher or Lower', dice: 'Dice Roll',
  coin: 'Coin Flip Streak', memory: 'Memory Match', word: 'Word Scramble',
  merge: 'Number Merge', reaction: 'Reaction Time', typing: 'Typing Speed',
  simon: 'Simon Says', slots: 'Slots', blackjack: 'Blackjack',
  whack: 'Whack-a-Mole', snake: 'Snake', tetris: 'Tetris',
  breakout: 'Breakout', flappy: 'Flappy Bird', minesweeper: 'Minesweeper',
  lightsout: 'Lights Out', mastermind: 'Mastermind', dodge: 'Dodge',
  mergeblitz: 'Merge Blitz', connect4: 'Connect Four',
  sudoku: 'Sudoku', mathdash: 'Math Dash', wordle: 'Wordle',
}

export default function AnalyticsDashboard({ stats }) {
  const analytics = useMemo(() => {
    if (!stats || !stats.games) return null
    const games = stats.games || {}
    const totalPlayed = Object.values(games).reduce((s, g) => s + (g.played || 0), 0)
    const totalWon = Object.values(games).reduce((s, g) => s + (g.won || 0), 0)
    const totalScore = Object.values(games).reduce((s, g) => s + (g.totalScore || 0), 0)
    const bestStreak = Math.max(0, ...Object.values(games).map(g => g.bestStreak || 0))

    const gameList = ALL_GAME_IDS
      .map(id => ({
        id,
        name: GAME_NAMES[id] || id,
        ...(games[id] || { played: 0, won: 0, totalScore: 0, bestStreak: 0, highScore: 0 }),
      }))
      .filter(g => g.played > 0)
      .sort((a, b) => b.played - a.played)

    const playDays = new Set()
    if (stats._daysPlayed) {
      stats._daysPlayed.forEach(d => playDays.add(d))
    }

    return { totalPlayed, totalWon, totalScore, bestStreak, gameList, playDays }
  }, [stats])

  if (!analytics) return null

  const { totalPlayed, totalWon, totalScore, bestStreak, gameList, playDays } = analytics
  const winRate = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0

  const today = new Date()
  const days = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ key, date: d, played: playDays.has(key) })
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const dailyGame = getDailyGame(ALL_GAME_IDS)

  return (
    <div style={{ padding: '0 4px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>📊 Your Analytics</h2>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: 8, marginBottom: 16,
      }}>
        {[
          { label: 'Games', value: totalPlayed, color: 'var(--accent, #8b5cf6)' },
          { label: 'Wins', value: totalWon, color: '#22c55e' },
          { label: 'Win Rate', value: `${winRate}%`, color: '#f59e0b' },
          { label: 'Total Score', value: totalScore.toLocaleString(), color: '#3b82f6' },
          { label: 'Best Streak', value: bestStreak, color: '#ef4444' },
          { label: 'Days Active', value: playDays.size, color: '#ec4899' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--card, #241845)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: 12, padding: '12px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'var(--card, #241845)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 14, padding: 16, marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, opacity: 0.7 }}>Activity (Last 90 Days)</div>
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {week.map((day, di) => (
                <div key={di} style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: day.played
                    ? `rgba(34, 197, 94, ${0.4 + Math.min(1, (wi * 7 + di) / 60)})`
                    : 'rgba(255,255,255,0.05)',
                  title: day.key,
                }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, opacity: 0.5 }}>
          <span>Less</span>
          {[0.15, 0.3, 0.5, 0.7, 1].map((o, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(34, 197, 94, ${o})` }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {gameList.length > 0 && (
        <div style={{
          background: 'var(--card, #241845)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
          borderRadius: 14, padding: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, opacity: 0.7 }}>Game Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {gameList.map(g => {
              const wr = g.played > 0 ? Math.round((g.won / g.played) * 100) : 0
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>{g.played} plays · {wr}% win</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, width: `${wr}%`,
                      background: wr >= 60 ? '#22c55e' : wr >= 40 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.5s',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
