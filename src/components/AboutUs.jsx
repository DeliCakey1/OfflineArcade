import { useEffect } from 'react'
import { LEAGUE_COIN_REWARDS, TOURNAMENT_COIN_REWARDS } from '../shopItems'
import { LEAGUE_RANKS, RANK_PROMO_DEMO, GAME_COINS, GAME_XP, SCORE_BASED_GAMES } from '../leagues'

const GAMES = [
  { name: 'Rock Paper Scissors', emoji: '✊', category: 'Chance', desc: 'Classic showdown against the bot' },
  { name: 'Split Steal Give Away', emoji: '💰', category: 'Card', desc: 'Outsmart the bot to win the prize' },
  { name: 'Guess The Number', emoji: '🔢', category: 'Brain', desc: "Crack the bot's number" },
  { name: 'Hot or Cold', emoji: '🌡️', category: 'Brain', desc: 'Getting warmer or colder?' },
  { name: 'Higher or Lower', emoji: '🃏', category: 'Card', desc: 'Guess if the next card is higher or lower' },
  { name: 'Dice Roll', emoji: '🎲', category: 'Chance', desc: 'Bet on the dice — exact, range, or parity' },
  { name: 'Coin Flip Streak', emoji: '🪙', category: 'Chance', desc: 'Call Heads or Tails, build a streak' },
  { name: 'Memory Match', emoji: '🧠', category: 'Brain', desc: 'Find all matching pairs' },
  { name: 'Word Scramble', emoji: '📚', category: 'Brain', desc: 'Unscramble the letters to guess the word' },
  { name: 'Number Merge', emoji: '🔢', category: 'Classic', desc: 'Slide tiles to merge same numbers' },
  { name: 'Reaction Time', emoji: '⚡', category: 'Reflex', desc: 'Click as fast as you can when it turns green' },
  { name: 'Typing Speed', emoji: '⌨️', category: 'Reflex', desc: 'Type each word as fast as you can' },
  { name: 'Simon Says', emoji: '🎵', category: 'Reflex', desc: 'Watch the sequence, then repeat it' },
  { name: 'Slots', emoji: '🎰', category: 'Chance', desc: 'Spin the reels, match symbols to win' },
  { name: 'Blackjack', emoji: '🃏', category: 'Card', desc: 'Get as close to 21 as you can' },
  { name: 'Whack-a-Mole', emoji: '🔨', category: 'Reflex', desc: 'Whack the moles as fast as you can' },
  { name: 'Snake', emoji: '🐍', category: 'Classic', desc: 'Eat food, grow longer, dodge yourself' },
  { name: 'Tetris', emoji: '🧱', category: 'Classic', desc: 'Stack blocks, clear lines, rack up points' },
  { name: 'Breakout', emoji: '🏓', category: 'Classic', desc: 'Smash all the bricks with the ball' },
  { name: 'Flappy Bird', emoji: '🐦', category: 'Classic', desc: 'Tap to flap, dodge the pipes' },
  { name: 'Minesweeper', emoji: '💣', category: 'Brain', desc: 'Clear the field without hitting a mine' },
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

        <section className="about-section about-hero">
          <h2>What is Offline Arcade?</h2>
          <p>
            Psst — I built a full arcade in my browser and you can play it right now.
          </p>
          <p>
            21 games. One app. No downloads, no ads, no BS. Offline Arcade is a browser-based arcade with Snake, Tetris, Blackjack, Flappy Bird, Minesweeper, Whack-a-Mole, Simon Says, Typing Speed, Memory Match, Rock Paper Scissors, a 2048-style merge game, and more. Open the link and you're playing.
          </p>
          <p>
            Here's what makes it different from every other browser game collection:
          </p>
          <p>
            <strong>A full competitive league system.</strong> 10 ranks themed as creatures, from Microbe to God. You're grouped with 19 other players, and every week the standings reset. Top players promote, bottom players get demoted. Hit Rank 1, buy a tournament ticket with in-game coins, and you enter the God Tournament: a 3-stage bracket cutting from 20 players to 15 to 10, with the top 3 earning massive rewards. It's genuinely competitive in a way you won't expect.
          </p>
          <p>
            <strong>Every game earns XP and coins.</strong> XP pushes you up the league ladder, coins buy you stuff in the shop. 50+ nameplate effects like Neon Glow, Rainbow Wave, Hologram, Fire Trail, and Matrix. 25 titles across rarity tiers from Common to Champion. 80+ achievements tracking win streaks, league milestones, and per-game records. Plus a daily challenge that rotates every day with a fresh game and difficulty.
          </p>
          <p>
            <strong>It works offline.</strong> Load it once, kill your wifi, everything still runs. Progress syncs to the cloud when you sign back in. Six themes: Neon Arcade, Retro CRT, Ocean, Pastel Dream, Crimson, Forest.
          </p>
          <p>
            Now the best part. <strong>A full tab cloaking system.</strong> Set it to open disguised as Canvas, Google Classroom, or any website you want. There's an about:blank mode that opens the arcade in a blank tab with a custom title and favicon. And a panic key. Record a custom keyboard sequence, type it, and the page instantly redirects to whatever safe URL you set. Nobody around you would ever know.
          </p>
          <p>
            Completely free. Try it.
          </p>
        </section>

        <section className="about-section">
          <h2>🎮 All 21 Games</h2>
          <p>Every game earns league XP (for climbing ranks) and coins (for the shop). Games fall into 5 categories:</p>
          <div className="about-category-labels">
            <span className="about-cat-chip">🎲 Chance</span>
            <span className="about-cat-chip">🧠 Brain</span>
            <span className="about-cat-chip">⚡ Reflex</span>
            <span className="about-cat-chip">🃏 Card</span>
            <span className="about-cat-chip">🕹️ Classic</span>
          </div>
          <div className="about-games-grid">
            {GAMES.map((g, i) => (
              <div key={i} className="about-game-chip">
                <span className="about-game-emoji">{g.emoji}</span>
                <div className="about-game-info">
                  <span className="about-game-name">{g.name}</span>
                  <span className="about-game-desc">{g.desc}</span>
                </div>
                <span className="about-game-cat">{g.category}</span>
              </div>
            ))}
          </div>
          <div className="about-game-earnings">
            <h3>How Earnings Work</h3>
            <p>
              <strong>Win/loss games</strong> (RPS, Blackjack, Dice, etc.) give fixed XP and coins on win. 
              Losses give 1/4 of the win XP and coins. Streak bonus: +1 coin per 3 wins in a row (max +5).
            </p>
            <p>
              <strong>Score-based games</strong> (Snake, Tetris, Breakout, Flappy Bird, Minesweeper) give XP on every play. 
              Coins scale with your score — higher score = more coins. 0 score = 0 coins.
            </p>
            <div className="about-earnings-table">
              <div className="about-earnings-row about-earnings-header">
                <span>Game</span><span>XP (win)</span><span>Coins (base)</span>
              </div>
              {Object.entries(GAME_XP).map(([id, xp]) => (
                <div key={id} className="about-earnings-row">
                  <span>{GAMES.find(g => g.name.toLowerCase().replace(/[^a-z]/g, '').includes(id.replace(/-/g, '')))?.name || id}</span>
                  <span>{xp}</span>
                  <span>{SCORE_BASED_GAMES.includes(id) ? `${GAME_COINS[id]} + score` : GAME_COINS[id]}</span>
                </div>
              ))}
            </div>
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
            {LEAGUE_RANKS.map(l => (
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
          <h3>Promotion & Demotion Zones</h3>
          <p>
            Every Wednesday, the top XP players in each league get promoted to the next rank up, 
            and the bottom XP players get demoted down. The stay zone is everyone in between.
          </p>
          <div className="about-zones-table">
            <div className="about-zones-row about-zones-header">
              <span>Rank</span><span>⬆️ Promote</span><span>➡️ Stay</span><span>⬇️ Demote</span>
            </div>
            {LEAGUE_RANKS.map(l => {
              const pd = RANK_PROMO_DEMO[l.rank]
              const stay = 20 - pd.promote - pd.demote
              return (
                <div key={l.rank} className="about-zones-row">
                  <span>{l.emoji} {l.name}</span>
                  <span className="about-zones-promote">{pd.promote}</span>
                  <span className="about-zones-stay">{stay}</span>
                  <span className="about-zones-demotion">{pd.demote}</span>
                </div>
              )
            })}
          </div>
          <p>
            Microbe (rank 10) has <strong>no demotion</strong> — you can't fall below it. 
            God (rank 1) top 8 players with a ticket enter the God Tournament.
          </p>
          <h3>League Coin Rewards</h3>
          <p>Top 3 players in each league earn bonus coins at season reset:</p>
          <div className="about-zones-table">
            <div className="about-zones-row about-zones-header">
              <span>Rank</span><span>🥇 1st</span><span>🥈 2nd</span><span>🥉 3rd</span>
            </div>
            {LEAGUE_RANKS.map(l => {
              const rewards = LEAGUE_COIN_REWARDS[l.rank] || { first: 0, second: 0, third: 0 }
              return (
                <div key={l.rank} className="about-zones-row">
                  <span>{l.emoji} {l.name}</span>
                  <span className="about-zones-promote">🪙 {rewards.first}</span>
                  <span>🪙 {rewards.second}</span>
                  <span>🪙 {rewards.third}</span>
                </div>
              )
            })}
          </div>
          <p>Players ranked 4th–20th get no league coins — just the XP and coins earned from playing games during the season.</p>
          <h3>Season Lockout</h3>
          <p>
            The last 24 hours before reset is a <strong>lockout period</strong> — you can't join new leagues 
            during this time. This prevents last-second entry and ensures fair competition.
          </p>
        </section>

        <section className="about-section">
          <h2>🏟️ God Tournament</h2>
          <p>
            The pinnacle of competition. When you reach <strong>God rank</strong> (rank 1) and finish 
            in the <strong>top 8</strong>, you can enter the God Tournament — but you'll need 
            a <strong>Tournament Ticket</strong> (costs 🪙 2,500 coins in the shop).
          </p>
          <p>
            <strong>Without a ticket:</strong> You still get your league coins (up to 🪙 1,000 for 1st place) 
            but you don't enter the tournament. You stay at God rank and can try again next week.
          </p>
          <p>
            <strong>With a ticket:</strong> The ticket is consumed on entry and is valid for all 3 tournament stages. 
            You don't need to buy a new ticket for Semi-Finals or Finals.
          </p>
          <h3>Tournament Stages</h3>
          <div className="about-tournament-stages">
            <div className="about-stage">
              <span className="about-stage-emoji">🏟️</span>
              <div>
                <strong>God Tournament</strong>
                <p>20 players compete. Top 15 advance to Semi-Finals. Bottom 5 demoted to Phoenix.</p>
              </div>
            </div>
            <div className="about-stage">
              <span className="about-stage-emoji">⚔️</span>
              <div>
                <strong>Semi-Finals</strong>
                <p>15 players compete. Top 10 advance to Finals. Bottom 5 demoted to Phoenix.</p>
              </div>
            </div>
            <div className="about-stage">
              <span className="about-stage-emoji">🏆</span>
              <div>
                <strong>Finals</strong>
                <p>10 players compete. Top 3 win big prizes. Bottom 7 demoted to Phoenix.</p>
              </div>
            </div>
          </div>
          <h3>Tournament Prizes (all stages)</h3>
          <div className="about-prizes">
            <div className="about-prize">🥇 1st — 🪙 {TOURNAMENT_COIN_REWARDS.first.toLocaleString()} coins</div>
            <div className="about-prize">🥈 2nd — 🪙 {TOURNAMENT_COIN_REWARDS.second.toLocaleString()} coins</div>
            <div className="about-prize">🥉 3rd — 🪙 {TOURNAMENT_COIN_REWARDS.third.toLocaleString()} coins</div>
          </div>
          <p>
            Finals winners stay at <strong>God rank</strong> and can compete again next season. 
            Your tournament wins and first place finishes are tracked as stats.
          </p>
          <h3>Tournament Demotions</h3>
          <p>
            Any player eliminated at any stage gets demoted to <strong>Phoenix (rank 2)</strong>. 
            From there, they can work their way back up to God and try again.
          </p>
        </section>

        <section className="about-section">
          <h2>💰 Coins & Shop</h2>
          <p>
            Every game earns you coins. Win/loss games give a fixed amount. 
            Score-based games (Snake, Tetris, Breakout, Flappy Bird, Minesweeper) 
            scale with your score — higher score = more coins. 0 score = 0 coins.
          </p>
          <p>
            Losses give 1/4 of the win coins. Streaks add a small bonus.
          </p>
          <h3>Shop Categories</h3>
          <div className="about-shop-cats">
            <div className="about-shop-cat">
              <strong>🏷️ Titles</strong>
              <p>25 titles across 5 rarity tiers: Common, Uncommon, Rare, Epic, Legendary, and Champion. 
              Prices range from 🪙 500 to 🪙 30,000. Champion titles are only available to tournament winners. 
              Titles display below your username in league standings.</p>
            </div>
            <div className="about-shop-cat">
              <strong>✨ Nameplates</strong>
              <p>Dual-slot cosmetic system. Equip a <strong>color</strong> (solid or gradient text color) AND 
              an <strong>effect</strong> (animated border/visual) simultaneously. Both apply to your name in leagues and user search.</p>
            </div>
            <div className="about-shop-cat">
              <strong>🎫 Tickets</strong>
              <p>Tournament Tickets (🪙 2,500) are required to enter the God Tournament. 
              One ticket covers all 3 stages. Buy from the shop or the Leagues page.</p>
            </div>
          </div>
          <h3>Nameplate Colors</h3>
          <p>10 solid colors (🪙 1,000–2,000) and 7 gradient colors (🪙 2,500–5,000):</p>
          <div className="about-cosmetic-list">
            <span className="about-cosmetic-chip" style={{color:'#ff3333'}}>Red</span>
            <span className="about-cosmetic-chip" style={{color:'#ff6b2b'}}>Orange</span>
            <span className="about-cosmetic-chip" style={{color:'#ffe600'}}>Yellow</span>
            <span className="about-cosmetic-chip" style={{color:'#39ff14'}}>Green</span>
            <span className="about-cosmetic-chip" style={{color:'#3b82f6'}}>Blue</span>
            <span className="about-cosmetic-chip" style={{color:'#b946ff'}}>Purple</span>
            <span className="about-cosmetic-chip" style={{color:'#ff2d7b'}}>Pink</span>
            <span className="about-cosmetic-chip" style={{color:'#00d4ff'}}>Cyan</span>
            <span className="about-cosmetic-chip" style={{color:'#ffffff'}}>White</span>
            <span className="about-cosmetic-chip" style={{color:'#ffd700'}}>Gold</span>
          </div>
          <p>Gradients: Sunset, Ocean, Forest, Fire, Royal, Gold Gradient, Rainbow</p>
          <h3>Nameplate Borders</h3>
          <p>7 borders (🪙 2,000–6,000): Solid Border, Red Border, Green Border, Gold Border, Gradient Border, Fire Border, Rainbow Border</p>
          <h3>Nameplate Effects (50+)</h3>
          <p>Animated visual effects that play on your name. Prices from 🪙 7,500 to 🪙 30,000:</p>
          <div className="about-effects-grid">
            <span className="about-effect-chip">Neon Glow</span>
            <span className="about-effect-chip">Neon Pink</span>
            <span className="about-effect-chip">Neon Blue</span>
            <span className="about-effect-chip">Neon Orange</span>
            <span className="about-effect-chip">Neon Purple</span>
            <span className="about-effect-chip">Neon Red</span>
            <span className="about-effect-chip">Neon White</span>
            <span className="about-effect-chip">Rainbow Wave</span>
            <span className="about-effect-chip">Gold Shimmer</span>
            <span className="about-effect-chip">Champion Glow</span>
            <span className="about-effect-chip">Diamond Dust</span>
            <span className="about-effect-chip">Smash</span>
            <span className="about-effect-chip">Spin In</span>
            <span className="about-effect-chip">Pop Out</span>
            <span className="about-effect-chip">Glitch</span>
            <span className="about-effect-chip">Float</span>
            <span className="about-effect-chip">Pulse</span>
            <span className="about-effect-chip">Fire Trail</span>
            <span className="about-effect-chip">Electric</span>
            <span className="about-effect-chip">Frost Bite</span>
            <span className="about-effect-chip">Toxic</span>
            <span className="about-effect-chip">Hologram</span>
            <span className="about-effect-chip">Phantom</span>
            <span className="about-effect-chip">Scanner</span>
            <span className="about-effect-chip">Wobble</span>
            <span className="about-effect-chip">Outline</span>
            <span className="about-effect-chip">Matrix</span>
            <span className="about-effect-chip">Comet Trail</span>
            <span className="about-effect-chip">Breathe</span>
          </div>
          <p>Champion Glow and Diamond Dust are exclusive to tournament winners.</p>
          <h3>How to Earn Coins</h3>
          <ul className="about-list">
            <li><strong>Playing games</strong> — every win earns coins, losses earn 1/4</li>
            <li><strong>League placement</strong> — top 3 earn bonus coins at season reset</li>
            <li><strong>Tournament prizes</strong> — 3,000 / 2,000 / 1,500 coins</li>
            <li><strong>Achievements</strong> — earning achievements grants coin rewards (10–1,000 coins each)</li>
          </ul>
          <p>You start with 0 coins. Everything is earned through gameplay. No microtransactions, no pay-to-win.</p>
        </section>

        <section className="about-section">
          <h2>🏆 Achievements</h2>
          <p>
            80+ achievements across multiple categories. Earn coin rewards for each one unlocked.
          </p>
          <h3>Categories</h3>
          <ul className="about-list">
            <li><strong>General</strong> — First win, games played milestones (1, 25, 50, 100, 250, 500, 1000), games won milestones, play all games, favorite games</li>
            <li><strong>XP</strong> — Earn 100, 500, 1K, 2.5K, 5K, 10K, 25K XP</li>
            <li><strong>League</strong> — Join a league, get promoted (1, 5, 10, 25, 50 times), reach each rank, win 10/50/100 league games</li>
            <li><strong>Tournament</strong> — Enter a tournament, win 1, 3, 5 tournaments, get 1st place 1, 3 times</li>
            <li><strong>Streaks</strong> — Win 3, 5, 10, 25, 50, 100 games in a row, multi-game streaks</li>
            <li><strong>Per-Game</strong> — Win 10, 50, 100 games in each individual game (Rock Paper Scissors, Snake, Tetris, etc.)</li>
            <li><strong>Daily</strong> — Complete a daily challenge, complete 7 daily challenges</li>
          </ul>
          <p>
            Coin rewards for achievements range from 🪙 10 (first game played) to 🪙 1,000 (100-game streak). 
            Achievements are tracked automatically as you play.
          </p>
        </section>

        <section className="about-section">
          <h2>📅 Daily Challenge</h2>
          <p>
            Every day, a new challenge rotates with a fresh game and difficulty setting. 
            Complete it for bonus XP and coins. A countdown timer shows when the next challenge starts.
          </p>
          <p>
            Daily challenges track your completion streak — complete 7 in a row for a bonus achievement.
          </p>
        </section>

        <section className="about-section">
          <h2>🎭 Cosmetics System</h2>
          <p>
            Personalize your profile with titles, nameplate colors, borders, and animated nameplate effects. 
            All cosmetic items are purchased with coins earned from gameplay.
          </p>
          <h3>Dual Nameplate Slots</h3>
          <p>
            You can equip TWO nameplate items at once: a <strong>color</strong> (solid/gradient text) AND 
            an <strong>effect</strong> (animated border). Both apply simultaneously to your name in league 
            standings, user search results, and the top bar.
          </p>
          <h3>Sync Across Devices</h3>
          <p>
            When you sign in, your cosmetics sync to the cloud via Firebase Firestore. 
            Sign in on another device and your title, nameplates, and effects are all there. 
            Guest players can play games but their cosmetic choices won't persist.
          </p>
          <h3>Rarity Tiers</h3>
          <div className="about-rarity-list">
            <span className="about-rarity-chip" style={{color:'#a3a3a3'}}>Common</span>
            <span className="about-rarity-chip" style={{color:'#22c55e'}}>Uncommon</span>
            <span className="about-rarity-chip" style={{color:'#3b82f6'}}>Rare</span>
            <span className="about-rarity-chip" style={{color:'#b946ff'}}>Epic</span>
            <span className="about-rarity-chip" style={{color:'#ffd700'}}>Legendary</span>
            <span className="about-rarity-chip" style={{color:'#ff2d7b'}}>Champion</span>
          </div>
        </section>

        <section className="about-section">
          <h2>👤 User Accounts</h2>
          <p>
            Sign in with <strong>Google</strong> or <strong>Apple</strong> to save your progress to the cloud. 
            Guest users can play all games, but progress won't persist across sessions.
          </p>
          <ul className="about-list">
            <li><strong>Username</strong> — Set a unique username to appear in league standings and user search</li>
            <li><strong>Display Name</strong> — Your Google/Apple name (can be changed)</li>
            <li><strong>User Search</strong> — Find other players by username via the search button in the top bar</li>
            <li><strong>Player Profiles</strong> — Click any player to see their stats, league rank, title, and nameplate</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>🎭 Themes</h2>
          <p>
            6 visual themes to customize the look of the entire site. Switch anytime in Settings.
          </p>
          <div className="about-themes-grid">
            <div className="about-theme-chip"><span>💜</span> Neon Arcade</div>
            <div className="about-theme-chip"><span>📺</span> Retro CRT</div>
            <div className="about-theme-chip"><span>🌊</span> Ocean</div>
            <div className="about-theme-chip"><span>🍬</span> Pastel Dream</div>
            <div className="about-theme-chip"><span>🔥</span> Crimson</div>
            <div className="about-theme-chip"><span>🌲</span> Forest</div>
          </div>
        </section>

        <section className="about-section">
          <h2>🔇 Settings & Customization</h2>
          <ul className="about-list">
            <li><strong>Sound effects</strong> — Toggle sound effects on/off, adjust volume</li>
            <li><strong>Background animations</strong> — Toggle particle effects, wave bar, glassmorphism</li>
            <li><strong>Theme</strong> — Switch between 6 visual themes</li>
            <li><strong>Favorites</strong> — Mark games as favorites for quick access</li>
            <li><strong>Stats</strong> — View detailed stats for every game: wins, losses, streaks, high scores</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>🔒 Tab Cloaking & Privacy</h2>
          <p>
            A full stealth system built for privacy. Three modes:
          </p>
          <ul className="about-list">
            <li><strong>Custom Redirect</strong> — Set the arcade to redirect to any URL (Canvas, Google Classroom, etc.) and open the real arcade in a new about:blank tab</li>
            <li><strong>about:blank Mode</strong> — Opens the arcade in a completely blank tab with a custom title and favicon. Address bar shows nothing.</li>
            <li><strong>Panic Key</strong> — Record a custom keyboard sequence. Type it anytime to instantly redirect to a safe URL. Nobody around you would ever know.</li>
          </ul>
          <h3>Security</h3>
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
            <li><strong>Backend:</strong> Node.js (HTTP server) for SPA routing</li>
            <li><strong>Database:</strong> Firebase Firestore</li>
            <li><strong>Auth:</strong> Firebase Authentication (Google, Apple, Email/Password)</li>
            <li><strong>Hosting:</strong> Render</li>
            <li><strong>Source Code:</strong> <a href="https://github.com/DeliCakey1/OfflineArcade" target="_blank" rel="noopener noreferrer" className="about-link">GitHub — DeliCakey1/OfflineArcade</a></li>
          </ul>
        </section>

        <section className="about-section about-footer-section">
          <p className="about-footer-text">
            Offline Arcade is a passion project. No ads, no tracking, no paywalls. 
            Just games. Have fun.
          </p>
          <p className="about-support-text">
            Questions, bugs, or feedback? Join the community on{' '}
            <a href="https://discord.gg/7uf5b25qfQ" target="_blank" rel="noopener noreferrer" className="about-link">Discord</a>.
          </p>
          <button className="about-cta-button" onClick={onBack}>
            <img src="/favicon.ico" alt="" className="about-cta-favicon" />
            Start playing now!
          </button>
        </section>

      </div>
    </div>
  )
}
