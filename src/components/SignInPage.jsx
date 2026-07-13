import { useState } from 'react'
import { signInWithGoogle, signInWithGitHub, signInWithApple, signInWithDiscord, signInWithMicrosoft } from '../auth'

export default function SignInPage({ onBack }) {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  async function handleSignIn(provider) {
    setLoading(provider)
    setError(null)
    try {
      if (provider === 'google') await signInWithGoogle()
      else if (provider === 'github') await signInWithGitHub()
      else if (provider === 'apple') await signInWithApple()
      else if (provider === 'discord') await signInWithDiscord()
      else if (provider === 'microsoft') await signInWithMicrosoft()
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setError(null)
      } else {
        setError(e.message || 'Sign-in failed. Please try again.')
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="signin-page">
      <div className="signin-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <h2>👤 Sign In</h2>
      </div>

      <div className="signin-info">
        <div className="signin-info-icon">☁️</div>
        <h3>Save Your Progress</h3>
        <p>Sign in to sync your stats, XP, league rank, and achievements across devices.</p>
      </div>

      <div className="signin-providers">
        <button className="signin-btn google" onClick={() => handleSignIn('google')} disabled={loading !== null}>
          <span className="signin-btn-icon">
            {loading === 'google' ? <span className="signin-spinner" /> : 'G'}
          </span>
          <span className="signin-btn-label">Continue with Google</span>
        </button>

        <button className="signin-btn github" onClick={() => handleSignIn('github')} disabled={loading !== null}>
          <span className="signin-btn-icon">
            {loading === 'github' ? <span className="signin-spinner" /> : '🐙'}
          </span>
          <span className="signin-btn-label">Continue with GitHub</span>
        </button>

        <button className="signin-btn microsoft" disabled>
          <span className="signin-btn-icon">🪟</span>
          <span className="signin-btn-label">Continue with Microsoft</span>
          <span className="signin-coming-soon">Coming Soon</span>
        </button>

        <button className="signin-btn apple" disabled>
          <span className="signin-btn-icon"></span>
          <span className="signin-btn-label">Continue with Apple</span>
          <span className="signin-coming-soon">Coming Soon</span>
        </button>

        <button className="signin-btn discord" disabled>
          <span className="signin-btn-icon">💬</span>
          <span className="signin-btn-label">Continue with Discord</span>
          <span className="signin-coming-soon">Coming Soon</span>
        </button>
      </div>

      {error && (
        <div className="signin-error">{error}</div>
      )}

      <p className="signin-note">You can continue playing without signing in. Your data will be saved locally on this device.</p>
    </div>
  )
}
