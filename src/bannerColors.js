export const BANNER_COLORS = {
  purple: { label: 'Purple', css: 'linear-gradient(135deg, rgba(139,92,246,.88), rgba(59,130,246,.88))' },
  blue: { label: 'Blue', css: 'linear-gradient(135deg, rgba(37,99,235,.9), rgba(14,165,233,.9))' },
  green: { label: 'Green', css: 'linear-gradient(135deg, rgba(22,163,74,.9), rgba(16,185,129,.9))' },
  red: { label: 'Red', css: 'linear-gradient(135deg, rgba(220,38,38,.9), rgba(249,115,22,.9))' },
  orange: { label: 'Orange', css: 'linear-gradient(135deg, rgba(245,158,11,.92), rgba(239,68,68,.9))' },
  pink: { label: 'Pink', css: 'linear-gradient(135deg, rgba(219,39,119,.9), rgba(168,85,247,.9))' },
  teal: { label: 'Teal', css: 'linear-gradient(135deg, rgba(13,148,136,.9), rgba(45,212,191,.9))' },
  gold: { label: 'Gold', css: 'linear-gradient(135deg, rgba(217,119,6,.92), rgba(234,179,8,.92))' },
  indigo: { label: 'Indigo', css: 'linear-gradient(135deg, rgba(99,102,241,.9), rgba(139,92,246,.9))' },
  slate: { label: 'Dark', css: 'linear-gradient(135deg, rgba(30,41,59,.92), rgba(51,65,85,.92))' },
}

export const BANNER_EMOJIS = ['📢', '📣', '⭐', '🎉', '🏆', '⚡', '🔥', '💎', '🎯', '🚀', '📅', '💰', '🎁', '💡', '🆕', '❤️']

export const BANNER_DEFAULTS = { color: 'purple', emoji: '📣' }

export function bannerColorCss(color) {
  return (BANNER_COLORS[color] || BANNER_COLORS.purple).css
}
