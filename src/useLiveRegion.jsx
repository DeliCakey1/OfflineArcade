import { createContext, useContext, useState, useCallback, useRef } from 'react'

const LiveRegionContext = createContext(null)

export function LiveRegionProvider({ children }) {
  const [message, setMessage] = useState('')
  const timeoutRef = useRef(null)

  const announce = useCallback((text, priority = 'polite') => {
    clearTimeout(timeoutRef.current)
    setMessage('')
    timeoutRef.current = setTimeout(() => setMessage(text), 50)
  }, [])

  return (
    <LiveRegionContext.Provider value={announce}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        {message}
      </div>
    </LiveRegionContext.Provider>
  )
}

export function useLiveRegion() {
  return useContext(LiveRegionContext)
}
