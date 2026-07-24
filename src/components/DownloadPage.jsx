import { useEffect } from 'react'

const GITHUB_RELEASE_URL = 'https://github.com/DeliCakey1/OfflineArcade/releases/latest'

export default function DownloadPage({ onBack }) {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="about-page">
      <div className="about-container">

        <button className="about-back" onClick={onBack}>← Back to Arcade</button>

        <div className="about-header">
          <span className="about-logo">🕹️</span>
          <h1 className="about-title">Download Offline Arcade</h1>
          <p className="about-tagline">Play offline, no browser needed</p>
        </div>

        <section className="about-section">
          <h2>📥 Desktop App</h2>
          <p>
            Download Offline Arcade as a real desktop application. Install it once, play forever — no browser tabs, no address bar, just the arcade.
          </p>
          <div className="download-platforms">
            <div className="download-card">
              <span className="download-card-icon">🪟</span>
              <span className="download-card-name">Windows</span>
              <span className="download-card-file">.exe installer</span>
              <a href={GITHUB_RELEASE_URL} target="_blank" rel="noopener noreferrer" className="download-btn">
                Download for Windows
              </a>
            </div>
            <div className="download-card">
              <span className="download-card-icon">🍎</span>
              <span className="download-card-name">macOS</span>
              <span className="download-card-file">.dmg installer</span>
              <a href={GITHUB_RELEASE_URL} target="_blank" rel="noopener noreferrer" className="download-btn">
                Download for Mac
              </a>
            </div>
            <div className="download-card">
              <span className="download-card-icon">🐧</span>
              <span className="download-card-name">Linux</span>
              <span className="download-card-file">.AppImage</span>
              <a href={GITHUB_RELEASE_URL} target="_blank" rel="noopener noreferrer" className="download-btn">
                Download for Linux
              </a>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>🌐 Install as an App (PWA)</h2>
          <p>
            You can also install the website as an app directly from your browser — no download needed.
          </p>
          <div className="download-pwa-steps">
            <div className="download-pwa-step">
              <span className="download-pwa-num">1</span>
              <span>Open Offline Arcade in Chrome, Edge, or Safari</span>
            </div>
            <div className="download-pwa-step">
              <span className="download-pwa-num">2</span>
              <span>Click the install icon in the address bar (or Menu → "Install Offline Arcade")</span>
            </div>
            <div className="download-pwa-step">
              <span className="download-pwa-num">3</span>
              <span>It will open in its own window — just like a real app</span>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>❓ Why Download?</h2>
          <ul className="about-list">
            <li><strong>Play offline</strong> — All 29 games work without internet</li>
            <li><strong>Real app feel</strong> — Opens in its own window, no browser chrome</li>
            <li><strong>Desktop shortcuts</strong> — Pin to taskbar or dock</li>
            <li><strong>Faster</strong> — No browser overhead</li>
            <li><strong>Cloud sync</strong> — Sign in to sync stats, coins, and cosmetics across devices</li>
          </ul>
        </section>

        <section className="about-section about-footer-section">
          <button className="about-cta-button" onClick={onBack}>
            <img src="/favicon.ico" alt="" className="about-cta-favicon" />
            Start playing now!
          </button>
        </section>

      </div>
    </div>
  )
}
