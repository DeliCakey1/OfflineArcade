import { useState } from 'react'
import { isPracticeMode, setPracticeMode } from '../practiceMode'

export default function PracticeModeToggle({ visible }) {
  const [active, setActive] = useState(isPracticeMode)

  if (!visible) return null

  function toggle() {
    const next = !active
    setActive(next)
    setPracticeMode(next)
  }

  return (
    <button
      className={`practice-toggle ${active ? 'active' : ''}`}
      onClick={toggle}
      title={active ? 'Practice mode ON — hints enabled' : 'Turn on practice mode'}
      aria-label={active ? 'Practice mode enabled' : 'Enable practice mode'}
    >
      <span className="dot" />
      🎯 Practice
    </button>
  )
}
