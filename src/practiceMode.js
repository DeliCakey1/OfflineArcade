const STORAGE_KEY = 'arcade-practice-mode'

export function isPracticeMode() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setPracticeMode(enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
}

export function getPracticeConfig() {
  if (!isPracticeMode()) return null
  return {
    showHints: true,
    noTimePressure: true,
    showSolution: true,
    unlimitedTries: true,
  }
}
