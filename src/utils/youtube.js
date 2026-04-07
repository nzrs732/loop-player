export function extractVideoId(url) {
  try {
    const u = new URL(url.trim())
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v'))
      return u.searchParams.get('v')
    if (u.hostname === 'youtu.be')
      return u.pathname.slice(1).split('?')[0]
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/shorts/'))
      return u.pathname.split('/shorts/')[1].split('?')[0]
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/'))
      return u.pathname.split('/embed/')[1].split('?')[0]
  } catch (_) {}
  return null
}

export function formatTime(sec) {
  sec = Math.floor(sec || 0)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}
