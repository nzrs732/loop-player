import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getLikedVideos, getWatchLater, getUserPlaylists, getPlaylistItems } from '../utils/youtubeApi.js'

const TABS = ['Liked', 'Watch Later', 'Playlists']

export default function LibraryPanel({ open, onOpen, onClose, onPlay, sidebar = false }) {
  const { token, isSignedIn } = useAuth()
  const [tab, setTab]                   = useState(0)
  const [items, setItems]               = useState([])
  const [playlists, setPlaylists]       = useState([])
  const [openPlaylist, setOpenPlaylist] = useState(null)
  const [nextPage, setNextPage]         = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const panelRef                        = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])


  // Reload when tab changes or panel opens
  useEffect(() => {
    if (!open || !token) return
    setOpenPlaylist(null)
    loadTab(tab, null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, open, token])

  async function loadTab(tabIdx, page) {
    setLoading(true)
    setError(null)
    if (!page) { setItems([]); setPlaylists([]) }
    try {
      if (tabIdx === 0) {
        const { items: vids, nextPageToken } = await getLikedVideos(token, page)
        setItems(prev => page ? [...prev, ...vids] : vids)
        setNextPage(nextPageToken)
      } else if (tabIdx === 1) {
        const { items: vids, nextPageToken } = await getWatchLater(token, page)
        setItems(prev => page ? [...prev, ...vids] : vids)
        setNextPage(nextPageToken)
      } else {
        const { playlists: pls, nextPageToken } = await getUserPlaylists(token, page)
        setPlaylists(prev => page ? [...prev, ...pls] : pls)
        setNextPage(nextPageToken)
      }
    } catch (err) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function openPlaylistDetail(playlist) {
    setOpenPlaylist(playlist)
    setLoading(true)
    setError(null)
    setItems([])
    setNextPage(null)
    try {
      const { items: vids, nextPageToken } = await getPlaylistItems(token, playlist.id)
      setItems(vids)
      setNextPage(nextPageToken)
    } catch (err) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  function loadMore() {
    if (!nextPage || loading) return
    if (openPlaylist) {
      getPlaylistItems(token, openPlaylist.id, nextPage).then(({ items: vids, nextPageToken }) => {
        setItems(prev => [...prev, ...vids])
        setNextPage(nextPageToken)
      })
    } else {
      loadTab(tab, nextPage)
    }
  }

  const showVideoList = tab !== 2 || openPlaylist != null

  if (sidebar) {
    return (
      <div
        ref={panelRef}
        className={`flex flex-col shrink-0 rounded-[22px] overflow-hidden h-full
          bg-black/40 backdrop-blur-sm border border-white/10 shadow-2xl
          transition-all duration-300 ease-in-out
          ${open ? 'w-80 opacity-100' : 'w-0 opacity-0 border-transparent'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          {openPlaylist
            ? (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => { setOpenPlaylist(null); setItems([]) }}
                  className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 4L7 10l5.5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="text-sm font-semibold truncate text-white">{openPlaylist.title}</span>
              </div>
            )
            : <span className="text-sm font-semibold text-white">Your Library</span>
          }
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Collapse"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 4L7 10l5.5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {!openPlaylist && (
          <div className="flex items-center gap-1 px-4 pb-3 shrink-0">
            {TABS.map((label, i) => (
              <button
                key={label}
                onClick={() => setTab(i)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer ${tab === i ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="h-px bg-white/10 mx-4 shrink-0" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {error && (
            <div className="px-4 py-4">
              <p className="text-[#ff6b6b] text-xs">{error}</p>
              {error.includes('403') && (
                <p className="text-white/40 text-[11px] mt-1">This playlist may not be accessible via the API.</p>
              )}
            </div>
          )}
          {showVideoList && (
            <ul>
              {items.map(video => (
                <VideoRow key={video.videoId} video={video} onPlay={() => onPlay(video.videoId)} />
              ))}
            </ul>
          )}
          {tab === 2 && !openPlaylist && (
            <ul>
              {playlists.map(pl => (
                <PlaylistRow key={pl.id} playlist={pl} onClick={() => openPlaylistDetail(pl)} />
              ))}
            </ul>
          )}
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            </div>
          )}
          {!loading && !error && showVideoList && items.length === 0 && (
            <p className="text-white/30 text-xs px-4 py-6 text-center">Nothing here yet.</p>
          )}
          {!loading && !error && tab === 2 && !openPlaylist && playlists.length === 0 && (
            <p className="text-white/30 text-xs px-4 py-6 text-center">No playlists found.</p>
          )}
          {!loading && nextPage && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Collapsed state — pill with label, same style as Back button */}
      {isSignedIn && !open && (
        <button
          onClick={onOpen}
          className="fixed top-5 left-5 z-50 flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm cursor-pointer px-3 py-2 whitespace-nowrap transition-colors shadow-2xl"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 4L13 10l-5.5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Your Library
        </button>
      )}

      {/* Floating panel — detached from edges like the player shell */}
      <div
        ref={panelRef}
        className={`fixed top-5 left-5 z-50 flex flex-col w-80 rounded-[22px] overflow-hidden
          bg-black/40 backdrop-blur-sm border border-white/10 shadow-2xl
          transition-all duration-300 ease-in-out
          ${open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}
        style={{ height: 'calc(100vh - 40px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          {openPlaylist
            ? (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => { setOpenPlaylist(null); setItems([]) }}
                  className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 4L7 10l5.5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="text-sm font-semibold truncate text-white">{openPlaylist.title}</span>
              </div>
            )
            : <span className="text-sm font-semibold text-white">Your Library</span>
          }
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Collapse"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 4L7 10l5.5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {!openPlaylist && (
          <div className="flex items-center gap-1 px-4 pb-3 shrink-0">
            {TABS.map((label, i) => (
              <button
                key={label}
                onClick={() => setTab(i)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer ${tab === i ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="h-px bg-white/10 mx-4 shrink-0" />

        {/* Scrollable content — scrollbar hidden */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {error && (
            <div className="px-4 py-4">
              <p className="text-[#ff6b6b] text-xs">{error}</p>
              {error.includes('403') && (
                <p className="text-white/40 text-[11px] mt-1">This playlist may not be accessible via the API.</p>
              )}
            </div>
          )}

          {showVideoList && (
            <ul>
              {items.map(video => (
                <VideoRow key={video.videoId} video={video} onPlay={() => { onPlay(video.videoId); onClose() }} />
              ))}
            </ul>
          )}

          {tab === 2 && !openPlaylist && (
            <ul>
              {playlists.map(pl => (
                <PlaylistRow key={pl.id} playlist={pl} onClick={() => openPlaylistDetail(pl)} />
              ))}
            </ul>
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            </div>
          )}

          {!loading && !error && showVideoList && items.length === 0 && (
            <p className="text-white/30 text-xs px-4 py-6 text-center">Nothing here yet.</p>
          )}
          {!loading && !error && tab === 2 && !openPlaylist && playlists.length === 0 && (
            <p className="text-white/30 text-xs px-4 py-6 text-center">No playlists found.</p>
          )}

          {!loading && nextPage && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function VideoRow({ video, onPlay }) {
  return (
    <li>
      <button
        onClick={onPlay}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left"
      >
        <img
          src={video.thumbnail}
          alt=""
          className="w-[68px] h-[38px] object-cover rounded-lg shrink-0 bg-white/5"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-[1.3] line-clamp-2">{video.title}</p>
          {video.channel && <p className="text-[11px] text-white/50 mt-0.5 truncate">{video.channel}</p>}
        </div>
      </button>
    </li>
  )
}

function PlaylistRow({ playlist, onClick }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left"
      >
        <div className="w-[68px] h-[38px] shrink-0 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
          {playlist.thumbnail
            ? <img src={playlist.thumbnail} alt="" className="w-full h-full object-cover" />
            : <PlaylistIcon />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-[1.3] truncate">{playlist.title}</p>
          <p className="text-[11px] text-white/50 mt-0.5">{playlist.itemCount} videos</p>
        </div>
        <svg className="w-4 h-4 shrink-0 text-white/30" viewBox="0 0 20 20" fill="none">
          <path d="M7.5 4l5.5 6-5.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </li>
  )
}

function PlaylistIcon() {
  return (
    <svg className="w-5 h-5 text-white/30" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 10h12M3 14h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <polygon points="17,12 23,16 17,20" fill="currentColor" opacity=".5"/>
    </svg>
  )
}
