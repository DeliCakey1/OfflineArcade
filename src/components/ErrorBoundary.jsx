import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Arcade error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onRetry) this.props.onRetry()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 300, padding: 24,
          textAlign: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 48 }}>💥</div>
          <h3 style={{ color: 'var(--text-light)', fontSize: 18, margin: 0 }}>
            {this.props.fallbackTitle || 'Something went wrong'}
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, maxWidth: 360, lineHeight: 1.5 }}>
            {this.props.fallbackMessage || 'This component failed to load. You can try again or go back.'}
          </p>
          {this.state.error && (
            <details style={{
              background: 'rgba(255,45,45,0.08)', border: '1px solid rgba(255,45,45,0.2)',
              borderRadius: 8, padding: 12, maxWidth: 400, width: '100%',
              fontSize: 12, color: 'var(--text-dim)', textAlign: 'left',
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: 4 }}>Error details</summary>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11 }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Fredoka', sans-serif",
              }}
            >Try Again</button>
            {this.props.onBack && (
              <button
                onClick={this.props.onBack}
                style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >Go Back</button>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
