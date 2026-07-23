import { ALL_NAMEPLATES, TITLES } from './shopItems'

export function getNameplateStyle(npId) {
  if (!npId) return {}
  const np = ALL_NAMEPLATES.find(n => n.id === npId)
  if (!np) return {}
  if (np.type === 'solid' && np.color) return { color: np.color }
  if (np.type === 'gradient' && np.gradient) return { background: np.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  return {}
}

export function getNameplateBorderStyle(npId) {
  if (!npId) return {}
  const np = ALL_NAMEPLATES.find(n => n.id === npId)
  if (!np) return {}
  if (np.type === 'border') {
    if (np.gradientBorder) return { border: '2px solid transparent', borderImage: `${np.gradientBorder} 1`, borderRadius: 4, padding: '1px 4px' }
    if (np.borderColor) return { border: `2px solid ${np.borderColor}`, borderRadius: 4, padding: '1px 4px' }
  }
  return {}
}

export function getNameplateEffectClass(npId) {
  if (!npId) return ''
  const np = ALL_NAMEPLATES.find(n => n.id === npId)
  if (!np) return ''
  if (np.type === 'effect') {
    if (np.neonColor) return 'np-fx-neon'
    if (np.id === 'np-fx-rainbow-wave') return 'np-fx-rainbow'
    if (np.id === 'np-fx-gold-shimmer') return 'np-fx-shimmer'
    if (np.id === 'np-fx-champion-glow') return 'np-fx-champion'
    if (np.id === 'np-fx-diamond-dust') return 'np-fx-diamond'
    if (np.id === 'np-fx-smash') return 'np-fx-smash'
    if (np.id === 'np-fx-spin-in') return 'np-fx-spin-in'
    if (np.id === 'np-fx-pop-out') return 'np-fx-pop-out'
    if (np.id === 'np-fx-glitch') return 'np-fx-glitch'
    if (np.id === 'np-fx-float') return 'np-fx-float'
    if (np.id === 'np-fx-pulse') return 'np-fx-pulse'
    if (np.id === 'np-fx-fire') return 'np-fx-fire'
    if (np.id === 'np-fx-electric') return 'np-fx-electric'
    if (np.id === 'np-fx-frost') return 'np-fx-frost'
    if (np.id === 'np-fx-toxic') return 'np-fx-toxic'
    if (np.id === 'np-fx-hologram') return 'np-fx-hologram'
    if (np.id === 'np-fx-ghost') return 'np-fx-ghost'
    if (np.id === 'np-fx-scanner') return 'np-fx-scanner'
    if (np.id === 'np-fx-wobble') return 'np-fx-wobble'
    if (np.id === 'np-fx-stroke') return 'np-fx-stroke'
    if (np.id === 'np-fx-matrix') return 'np-fx-matrix'
    if (np.id === 'np-fx-comet') return 'np-fx-comet'
    if (np.id === 'np-fx-breathe') return 'np-fx-breathe'
  }
  if (np.type === 'border') return 'np-fx-border'
  return ''
}

export function getNameplateNeonColor(npId) {
  if (!npId) return null
  const np = ALL_NAMEPLATES.find(n => n.id === npId)
  return np?.neonColor || null
}

export function getTitleName(titleId) {
  if (!titleId) return null
  const t = TITLES.find(ti => ti.id === titleId)
  return t?.name || null
}
