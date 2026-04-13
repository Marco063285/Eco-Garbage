const ICON_MAP = {
  trash: '🗑️',
  leaf: '🍂',
  bottle: '🧴',
  newspaper: '📦',
  glass: '🪟',
  wrench: '🔩',
  laptop: '💻',
  warning: '☣️',
  couch: '🛋️',
}

export default function getCategoryIcon(icon) {
  return ICON_MAP[icon] || '🗑️'
}
