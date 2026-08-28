// Small helpers shared across list/kanban/board views

export function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(148, 163, 184, ${alpha})`
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Rough perceived-brightness check so text stays legible on any bg color
export function isLightColor(hex) {
  if (!hex) return true
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 150
}

export const PRESET_COLORS = [
  '#93C5A3', // sage green
  '#8FB4DB', // dusty blue
  '#E8C57E', // soft gold
  '#E29A9A', // dusty rose
  '#C7A9DC', // lavender
  '#A9A9C7', // periwinkle gray
  '#F0B08A', // peach
  '#7FC8C0', // teal
]
