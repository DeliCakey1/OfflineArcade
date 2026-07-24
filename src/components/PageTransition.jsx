import { useState, useEffect } from 'react'

export default function PageTransition({ children, pageKey }) {
  const [display, setDisplay] = useState(children)
  const [animClass, setAnimClass] = useState('page-enter')

  useEffect(() => {
    setAnimClass('page-exit')
    const timer = setTimeout(() => {
      setDisplay(children)
      setAnimClass('page-enter')
    }, 180)
    return () => clearTimeout(timer)
  }, [pageKey])

  return (
    <div className={animClass} style={{ minHeight: '100%' }}>
      {display}
    </div>
  )
}
