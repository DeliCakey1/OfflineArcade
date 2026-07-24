import { useEffect, useRef } from 'react'

export default function useFocusTrap(active = true) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!active || !containerRef.current) return
    const container = containerRef.current
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first.focus()

    function handleTab(e) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    function handleEsc(e) {
      if (e.key === 'Escape') container.querySelector('[data-focus-trap-close]')?.click()
    }

    container.addEventListener('keydown', handleTab)
    container.addEventListener('keydown', handleEsc)
    return () => {
      container.removeEventListener('keydown', handleTab)
      container.removeEventListener('keydown', handleEsc)
    }
  }, [active])

  return containerRef
}
