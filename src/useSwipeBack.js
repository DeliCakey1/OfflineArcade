import { useEffect, useRef } from 'react'

export default function useSwipeBack(onSwipeBack, threshold = 80) {
  const startX = useRef(0)
  const startY = useRef(0)
  const tracking = useRef(false)

  useEffect(() => {
    function onTouchStart(e) {
      const touch = e.touches[0]
      if (touch.clientX < 30) {
        tracking.current = true
        startX.current = touch.clientX
        startY.current = touch.clientY
      }
    }

    function onTouchMove(e) {
      if (!tracking.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - startX.current
      const dy = Math.abs(touch.clientY - startY.current)
      if (dy > 50) {
        tracking.current = false
        return
      }
      if (dx > threshold) {
        tracking.current = false
        onSwipeBack?.()
      }
    }

    function onTouchEnd() {
      tracking.current = false
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onSwipeBack, threshold])
}
