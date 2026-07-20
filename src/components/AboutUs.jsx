import { useEffect } from 'react'

const LEAGUES = [
  { rank: 10, name: 'Microbe', emoji: '🦠' },
  { rank: 9, name: 'Insect', emoji: '🐛' },
  { rank: 8, name: 'Bird', emoji: '🐦' },
  { rank: 7, name: 'Lion', emoji: '🦁' },
  { rank: 6, name: 'Dinosaur', emoji: '🦕' },
  { rank: 5, name: 'Monster', emoji: '👹' },
  { rank: 4, name: 'Thunderbird', emoji: '🪶' },
  { rank: 3, name: 'Cosmic', emoji: '🌌' },
  { rank: 2, name: 'Phoenix', emoji: '🔥' },
  { rank: 1, name: 'God', emoji: '⚡' },
]

const GAMES = [
  { name: 'Rock Paper Scissors', emoji: '✊', category: 'Chance' },
  { name: 'Split Steal Give Away', emoji: '💰', category: 'Card' },
  { name: 'Guess The Number', emoji: '🔢', category: 'Brain' },
  { name: 'Hot or Cold', emoji: '🌡️', category: 'Brain' },
  { name: 'Higher or Lower', emoji: '🃏', category: 'Card' },
  { name: 'Dice Roll', emoji: '🎲', category: 'Chance' },
  { name: 'Coin Flip Streak', emoji: '🪙', category: 'Chance' },
  { name: 'Memory Match', emoji: '🧠', category: 'Brain' },
  { name: 'Word Scramble', emoji: '📚', category: 'Brain' },
  { name: 'Number Merge', emoji: '🔢', category: 'Classic' },
  { name: 'Reaction Time', emoji: '⚡', category: 'Reflex' },
  { name: 'Typing Speed', emoji: '⌨️', category: 'Reflex' },
  { name: 'Simon Says', emoji: '🎵', category: 'Reflex' },
  { name: 'Slots', emoji: '🎰', category: 'Chance' },
  { name: 'Blackjack', emoji: '🃏', category: 'Card' },
  { name: 'Whack-a-Mole', emoji: '🔨', category: 'Reflex' },
  { name: 'Snake', emoji: '🐍', category: 'Classic' },
  { name: 'Tetris', emoji: '🧱', category: 'Classic' },
  { name: 'Breakout', emoji: '🏓', category: 'Classic' },
  { name: 'Flappy Bird', emoji: '🐦', category: 'Classic' },
  { name: 'Minesweeper', emoji: '💣', category: 'Brain' },
]

export default function AboutUs({ onBack }) {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="about-page">
      <div className="about-container">

        <button className="about-back" onClick={onBack}>← Back to Arcade</button>

        <div className="about-header">
          <span className="about-logo">🕹️</span>
          <h1 className="about-title">Offline Arcade</h1>
          <p className="about-tagline">A free, open-source multiplayer arcade website</p>
        </div>

        <section className="about-section">
          <h2>What is Offline Arcade?</h2>
          <p>
            Offline Arcade is a free-to-play web arcade featuring <strong>21 games</strong> across 5 categories — 
            Chance, Brain, Reflex, Card, and Classic. No downloads, no installs. 
            Just open your browser and play.
          </p>
          <p>
            The site is built for fun, competition, and persistence. Your progress saves to the cloud 
            when you sign in, so you can pick up right where you left off on any device.
          </p>
        </section>

        <section className="about-section">
          <h2>🎮 Games</h2>
          <p>21 games across 5 categories:</p>
          <div className="about-games-grid">
            {GAMES.map((g, i) => (
              <div key={i} className="about-game-chip">
                <span className="about-game-emoji">{g.emoji}</span>
                <span className="about-game-name">{g.name}</span>
                <span className="about-game-cat">{g.category}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>⚔️ League System</h2>
          <p>
            Every week, players compete in leagues. Win games to earn league XP. 
            The top players get promoted to a higher league, while the bottom players get demoted. 
            Leagues reset every <strong>Wednesday at midnight UTC</strong>.
          </p>
          <p>There are 10 ranks, from worst to best:</p>
          <div className="about-leagues-list">
            {LEAGUES.map(l => (
              <div key={l.rank} className="about-league-item">
                <span className="about-league-emoji">{l.emoji}</span>
                <span className="about-league-name">{l.name}</span>
                <span className="about-league-rank">Rank {l.rank}</span>
              </div>
            ))}
          </div>
          <p>
            Each league has <strong>20 players</strong>. The top players promote, the middle stay, 
            and the bottom players demote. The exact numbers vary by rank — lower ranks promote 
            more players, while higher ranks are more competitive.
          </p>
        </section>

        <section className="about-section">
          <h2>🏟️ God Tournament</h2>
          <p>
            The pinnacle of competition. When you reach <strong>God rank</strong> (rank 1) and finish 
            in the <strong>top 8</strong>, you can enter the God Tournament — but you'll need 
            a <strong>Tournament Ticket</strong> (costs 2,500 coins in the shop).
          </p>
          <p>The tournament has 3 stages:</p>
          <div className="about-tournament-stages">
            <div className="about-stage">
              <span className="about-stage-emoji">🏟️</span>
              <div>
                <strong>God Tournament</strong>
                <p>20 players compete. Top 15 advance.</p>
              </div>
            </div>
            <div className="about-stage">
              <span className="about-stage-emoji">⚔️</span>
              <div>
                <strong>Semi-Finals</strong>
                <p>15 players compete. Top 10 advance.</p>
              </div>
            </div>
            <div className="about-stage">
              <span className="about-stage-emoji">🏆</span>
              <div>
                <strong>Finals</strong>
                <p>10 players compete. Top 3 win big prizes.</p>
              </div>
            </div>
          </div>
          <p>
            Tournament prizes: <strong>🥇 3,000 coins · 🥈 2,000 coins · 🥉 1,500 coins</strong>. 
            Winners stay at God rank and can compete again next season. 
            Losers get demoted to Phoenix (rank 2).
          </p>
        </section>

        <section className="about-section">
          <h2>💰 Coins & Shop</h2>
          <p>
            Every game earns you coins. Win/loss games give a fixed amount. 
            Score-based games (Snake, Tetris, Breakout, Flappy Bird, Minesweeper) 
            scale with your score — higher score = more coins.
          </p>
          <p>
            Spend coins in the Shop on:
          </p>
          <ul className="about-list">
            <li><strong>Titles</strong> — Display above your username</li>
            <li><strong>Nameplate Colors</strong> — Solid and gradient colors for your name</li>
            <li><strong>Nameplate Effects</strong> — Animated borders like Neon, Fire, Hologram, and more</li>
            <li><strong>Tournament Tickets</strong> — Required to enter the God Tournament</li>
          </ul>
          <p>
            You start with 0 coins. Everything is earned through gameplay. 
            No microtransactions, no pay-to-win.
          </p>
        </section>

        <section className="about-section">
          <h2>🏆 Achievements</h2>
          <p>
            Earn achievements by playing games, winning streaks, reaching league ranks, 
            and more. There are achievements across multiple categories: general, 
            XP milestones, league progress, and per-game challenges.
          </p>
        </section>

        <section className="about-section">
          <h2>🎭 Cosmetics</h2>
          <p>
            Personalize your profile with titles, nameplate colors, and animated nameplate effects. 
            All cosmetic items are purchased with coins earned from gameplay.
          </p>
          <p>
            Your cosmetics are saved to your account, so they sync across devices 
            when you sign in. Guest players can play games but their progress won't save.
          </p>
        </section>

        <section className="about-section">
          <h2>🔒 Privacy & Security</h2>
          <ul className="about-list">
            <li>Sign in with Google or Apple — we never see your password</li>
            <li>All game data is stored in Firebase Firestore</li>
            <li>No tracking, no ads, no cookies</li>
            <li>The site is fully open source on <a href="https://github.com/DeliCakey1/OfflineArcade" target="_blank" rel="noopener noreferrer" className="about-link">GitHub</a></li>
          </ul>
        </section>

        <section className="about-section">
          <h2>🛠️ Tech Stack</h2>
          <ul className="about-list">
            <li><strong>Frontend:</strong> React + Vite</li>
            <li><strong>Backend:</strong> Node.js (Express) for SPA routing</li>
            <li><strong>Database:</strong> Firebase Firestore</li>
            <li><strong>Auth:</strong> Firebase Authentication (Google, Apple, Email/Password)</li>
            <li><strong>Hosting:</strong> Render</li>
            <li><strong>Source:</strong> <a href="https://github.com/DeliCakey1/OfflineArcade" target="_blank" rel="noopener noreferrer" className="about-link">GitHub</a></li>
          </ul>
        </section>

        <section className="about-section about-footer-section">
          <p className="about-footer-text">
            Offline Arcade is a passion project. No ads, no tracking, no paywalls. 
            Just games. Have fun.
          </p>
        </section>

      </div>
    </div>
  )
}
