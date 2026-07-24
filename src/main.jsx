import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { LiveRegionProvider } from './useLiveRegion'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LiveRegionProvider>
      <App />
    </LiveRegionProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
