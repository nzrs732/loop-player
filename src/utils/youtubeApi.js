const BASE = 'https://www.googleapis.com/youtube/v3'

// Fetch up to `maxResults` items from a playlist by its ID.
// Special playlist IDs: 'LL' = Liked Videos, 'WL' = Watch Later
async function fetchPlaylistItems(token, playlistId, pageToken = null, maxResults = 50) {
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults,
    ...(pageToken ? { pageToken } : {}),
  })
  const res = await fetch(`${BASE}/playlistItems?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
  const data = await res.json()

  return {
    items: (data.items || []).map(item => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      channel: item.snippet.videoOwnerChannelTitle || '',
      thumbnail:
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url ||
        `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`,
      publishedAt: item.snippet.publishedAt,
    })).filter(v => v.videoId && v.title !== 'Deleted video' && v.title !== 'Private video'),
    nextPageToken: data.nextPageToken || null,
  }
}

// Liked Videos playlist (special ID: LL)
export function getLikedVideos(token, pageToken) {
  return fetchPlaylistItems(token, 'LL', pageToken)
}

// Watch Later playlist (special ID: WL)
export function getWatchLater(token, pageToken) {
  return fetchPlaylistItems(token, 'WL', pageToken)
}

// User's own playlists
export async function getUserPlaylists(token, pageToken = null) {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    mine: true,
    maxResults: 50,
    ...(pageToken ? { pageToken } : {}),
  })
  const res = await fetch(`${BASE}/playlists?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
  const data = await res.json()

  return {
    playlists: (data.items || []).map(p => ({
      id: p.id,
      title: p.snippet.title,
      itemCount: p.contentDetails.itemCount,
      thumbnail:
        p.snippet.thumbnails?.medium?.url ||
        p.snippet.thumbnails?.default?.url ||
        null,
    })),
    nextPageToken: data.nextPageToken || null,
  }
}

// Items inside a specific user playlist
export function getPlaylistItems(token, playlistId, pageToken) {
  return fetchPlaylistItems(token, playlistId, pageToken)
}
