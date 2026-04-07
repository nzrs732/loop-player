import { useEffect, useRef, useState, useCallback } from 'react'
import { formatTime } from '../utils/youtube.js'

export default function PlayerPage({ videoId, onBack }) {
  const shellRef      = useRef(null)
  const playerRef     = useRef(null)
  const intervalRef   = useRef(null)
  const hideTimerRef  = useRef(null)
  const isDraggingRef = useRef(false)

  const [ctrlVisible, setCtrlVisible]     = useState(true)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [isMuted, setIsMuted]             = useState(false)
  const [isFullscreen, setIsFullscreen]   = useState(false)
  const [progressPct, setProgressPct]     = useState(0)
  const [timeStr, setTimeStr]             = useState('0:00 / 0:00')
  const [title, setTitle]                 = useState('Loading…')
  const [subtitle, setSubtitle]           = useState('')
  const [thumbVisible, setThumbVisible]   = useState(false)
  const [thumbLeft, setThumbLeft]         = useState(0)
  const [thumbTime, setThumbTime]         = useState('')
  const [thumbSrc, setThumbSrc]           = useState('')
  const [menuOpen, setMenuOpen]           = useState(false)
  const [speedOpen, setSpeedOpen]         = useState(false)
  const [playbackRate, setPlaybackRate]   = useState(1)
  const [keepOnPause, setKeepOnPause]     = useState(true)
  const [isLoop, setIsLoop]               = useState(false)
  const isLoopRef                         = useRef(false)

  // ── Show / hide controls ──────────────────────────────────────
  const showControls = useCallback(() => {
    setCtrlVisible(true)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current) setCtrlVisible(false)
    }, 3000)
  }, [])

  // When paused + keepOnPause on → keep controls visible permanently
  const showControlsRef = useRef(showControls)
  showControlsRef.current = showControls

  useEffect(() => {
    showControls()
    return () => clearTimeout(hideTimerRef.current)
  }, [showControls])

  // When paused, pin or unpin controls depending on keepOnPause
  useEffect(() => {
    if (!isPlaying) {
      if (keepOnPause) {
        clearTimeout(hideTimerRef.current)
        setCtrlVisible(true)
      } else {
        showControlsRef.current()
      }
    }
  }, [isPlaying, keepOnPause])

  // ── Fetch video title ─────────────────────────────────────────
  useEffect(() => {
    setThumbSrc(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`)
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then(r => r.json())
      .then(d => {
        setTitle(d.title || 'Untitled')
        setSubtitle(d.author_name || '')
      })
      .catch(() => setTitle('YouTube Video'))
  }, [videoId])

  // ── Init YouTube IFrame API ───────────────────────────────────
  useEffect(() => {
    function createPlayer() {
      playerRef.current = new window.YT.Player('yt-player', {
        videoId,
        playerVars: {
          controls: 0, disablekb: 1, fs: 0,
          modestbranding: 1, rel: 0, iv_load_policy: 3,
          autoplay: 1,
          origin: window.location.origin, enablejsapi: 1,
        },
        events: {
          onReady: () => { playerRef.current.playVideo() },
          onStateChange: ({ data }) => {
            const S = window.YT.PlayerState
            if (data === S.PLAYING)  { setIsPlaying(true);  startProgress() }
            if (data === S.PAUSED)   { setIsPlaying(false); stopProgress()  }
            if (data === S.ENDED)    {
              if (isLoopRef.current) {
                playerRef.current.seekTo(0, true)
                playerRef.current.playVideo()
              } else {
                setIsPlaying(false); stopProgress()
              }
            }
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      createPlayer()
    } else {
      window.onYouTubeIframeAPIReady = createPlayer
      if (!document.getElementById('yt-api-script')) {
        const s = document.createElement('script')
        s.id = 'yt-api-script'
        s.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(s)
      }
    }

    return () => {
      stopProgress()
      if (playerRef.current?.destroy) playerRef.current.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // ── Progress ticker ───────────────────────────────────────────
  function startProgress() {
    stopProgress()
    intervalRef.current = setInterval(() => {
      const p = playerRef.current
      if (!p || isDraggingRef.current) return
      const dur = p.getDuration?.() || 0
      const cur = p.getCurrentTime?.() || 0
      if (dur === 0) return
      setProgressPct((cur / dur) * 100)
      setTimeStr(`${formatTime(cur)} / ${formatTime(dur)}`)
    }, 250)
  }

  function stopProgress() {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  // ── Transport ─────────────────────────────────────────────────
  function togglePlay() {
    const p = playerRef.current
    if (!p) return
    const S = window.YT.PlayerState
    p.getPlayerState() === S.PLAYING ? p.pauseVideo() : p.playVideo()
    showControls()
  }

  function skip(delta) {
    const p = playerRef.current
    if (!p) return
    const dur = p.getDuration?.() || 0
    p.seekTo(Math.max(0, Math.min(dur, p.getCurrentTime() + delta)), true)
    showControls()
  }

  function toggleMute() {
    const p = playerRef.current
    if (!p) return
    if (isMuted) { p.unMute(); setIsMuted(false) }
    else         { p.mute();   setIsMuted(true)  }
    showControls()
  }

  function toggleLoop() {
    const next = !isLoop
    setIsLoop(next)
    isLoopRef.current = next
  }

  function setRate(rate) {
    playerRef.current?.setPlaybackRate(rate)
    setPlaybackRate(rate)
    setSpeedOpen(false)
  }

  // ── Fullscreen ────────────────────────────────────────────────
  function toggleFullscreen() {
    if (!isFullscreen) shellRef.current?.requestFullscreen?.()
    else               document.exitFullscreen?.()
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // ── Keyboard ──────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space' || e.key === 'k') { e.preventDefault(); togglePlay() }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); skip(-15) }
      if (e.key === 'ArrowRight') { e.preventDefault(); skip(15)  }
      if (e.key === 'm') toggleMute()
      if (e.key === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, isFullscreen])

  // Close menus on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (!e.target.closest('#more-menu-wrap')) setMenuOpen(false)
      if (!e.target.closest('#speed-menu-wrap')) setSpeedOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // ── Progress bar helpers ──────────────────────────────────────
  function getPct(e, el) {
    const rect = el.getBoundingClientRect()
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left
    return Math.max(0, Math.min(1, x / rect.width))
  }

  function seekToPct(pct) {
    const p = playerRef.current
    if (!p) return
    const dur = p.getDuration?.() || 0
    setProgressPct(pct * 100)
    p.seekTo(pct * dur, true)
  }

  function onProgressMouseMove(e) {
    const bg = e.currentTarget.querySelector('#progress-bg')
    const pct = getPct(e, bg)
    const dur = playerRef.current?.getDuration?.() || 0
    setThumbTime(formatTime(pct * dur))
    const shellRect = shellRef.current.getBoundingClientRect()
    setThumbLeft(e.clientX - shellRect.left)
    setThumbVisible(true)
    if (isDraggingRef.current) seekToPct(pct)
  }

  function onProgressMouseDown(e) {
    isDraggingRef.current = true
    seekToPct(getPct(e, e.currentTarget.querySelector('#progress-bg')))
  }

  useEffect(() => {
    function onMouseUp() { isDraggingRef.current = false; setThumbVisible(false) }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden flex items-center justify-center p-3 sm:p-5">

        {/* Player shell */}
        <div
          ref={shellRef}
          onMouseMove={showControls}
          onMouseLeave={() => {
            if (isPlaying || !keepOnPause) {
              clearTimeout(hideTimerRef.current)
              hideTimerRef.current = setTimeout(() => setCtrlVisible(false), 800)
            }
          }}
          className={`player-shell relative h-full aspect-video rounded-[28px] overflow-hidden bg-black shrink-0 ${ctrlVisible ? 'ctrl-visible' : ''}`}
        >
          {/* YouTube iframe */}
          <div id="yt-player" className="absolute inset-0 w-full h-full" />

          {/* Back button — overlaid top-left inside the player */}
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-[4] flex items-center gap-1 bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors text-white text-sm cursor-pointer rounded-full px-3 py-2 whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 4L7 10l5.5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          {/* Gradient scrim */}
          <div className="scrim absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300" />

          {/* Thumbnail preview */}
          {thumbVisible && (
            <div
              className="absolute bottom-[72px] flex flex-col items-center gap-1 pointer-events-none z-20 -translate-x-1/2"
              style={{ left: thumbLeft }}
            >
              <img src={thumbSrc} alt="" className="w-[120px] h-[68px] object-cover rounded-2xl border-2 border-white/20" />
              <span className="text-[11px] font-semibold text-white bg-black/70 px-2 py-0.5 rounded-full">{thumbTime}</span>
            </div>
          )}

          {/* Click zone */}
          <div className="absolute inset-0 z-[2] cursor-default" onClick={togglePlay} />

          {/* Controls overlay */}
          <div className="controls absolute bottom-0 left-0 right-0 px-3 sm:px-5 pb-3 sm:pb-4 flex flex-col gap-1 opacity-0 transition-opacity duration-300 pointer-events-none z-[3]">

            {/* Progress bar */}
            <div
              id="progress-wrap"
              className="progress-wrap w-full py-2 cursor-pointer"
              onMouseMove={onProgressMouseMove}
              onMouseLeave={() => setThumbVisible(false)}
              onMouseDown={onProgressMouseDown}
              onClick={e => seekToPct(getPct(e, e.currentTarget.querySelector('#progress-bg')))}
            >
              <div id="progress-bg" className="progress-bg relative w-full h-[3px] bg-white/20 rounded-full transition-all duration-150">
                <div className="absolute inset-y-0 left-0 bg-white rounded-full" style={{ width: `${progressPct}%`, transition: 'width .1s linear' }} />
                <div
                  id="progress-thumb"
                  className="progress-thumb absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white scale-0 transition-transform duration-150 pointer-events-none"
                  style={{ left: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-1 sm:gap-2">

              {/* Left: transport */}
              <div className="flex items-center shrink-0">
                <CtrlBtn onClick={togglePlay} title="Play / Pause">
                  {isPlaying
                    ? <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16" rx="1" fill="#fff"/><rect x="15" y="4" width="4" height="16" rx="1" fill="#fff"/></svg>
                    : <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20" fill="#fff"/></svg>
                  }
                </CtrlBtn>
                <CtrlBtn onClick={() => skip(-15)} title="Skip back 15 s">
                  <SkipBackIcon />
                </CtrlBtn>
                <CtrlBtn onClick={() => skip(15)} title="Skip forward 15 s">
                  <SkipFwdIcon />
                </CtrlBtn>
              </div>

              {/* Center: title */}
              <div className="flex-1 min-w-0 px-2 sm:px-3">
                <div className="flex flex-col gap-px min-w-0">
                  <span className="text-xs sm:text-sm font-semibold truncate leading-[1.3]">{title}</span>
                  {subtitle && <span className="text-[11px] sm:text-xs text-white/60 truncate">{subtitle}</span>}
                </div>
              </div>

              {/* Right: utilities */}
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <span id="time-display" className="text-[11px] sm:text-xs text-white/60 whitespace-nowrap mr-1 hidden sm:inline">{timeStr}</span>

                <CtrlBtn onClick={toggleLoop} title={isLoop ? 'Loop on' : 'Loop off'}>
                  <LoopIcon active={isLoop} />
                </CtrlBtn>

                <CtrlBtn onClick={toggleMute} title="Toggle mute">
                  {isMuted ? <MuteIcon /> : <VolumeIcon />}
                </CtrlBtn>

                <CtrlBtn title="Subtitles" className="hidden sm:flex">
                  <SubtitlesIcon />
                </CtrlBtn>

                {/* Speed button */}
                <div id="speed-menu-wrap" className="relative">
                  <CtrlBtn onClick={() => { setSpeedOpen(o => !o); setMenuOpen(false) }} title="Playback speed">
                    <SpeedIcon />
                  </CtrlBtn>
                  {speedOpen && (
                    <div className="absolute bottom-10 right-0 bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[140px] z-50">
                      <div className="px-4 py-2 text-[11px] text-white/40 uppercase tracking-wider font-semibold">Speed</div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                        <button
                          key={r}
                          onClick={() => setRate(r)}
                          className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-white/10 flex items-center gap-3 ${playbackRate === r ? 'text-white font-semibold' : 'text-white/80'}`}
                        >
                          <svg className="w-4 h-4 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 2a8 8 0 1 0 0 16A8 8 0 0 0 12 4zm0 2v6l4 2-1 1.7L11 14V6h1z" fill="#fff"/>
                          </svg>
                          {r === 1 ? 'Normal' : `${r}×`}
                          {playbackRate === r && (
                            <svg className="w-3.5 h-3.5 ml-auto" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <CtrlBtn onClick={toggleFullscreen} title="Fullscreen">
                  {isFullscreen ? <ExitFsIcon /> : <FsIcon />}
                </CtrlBtn>

                {/* Three-dots menu — copy link, open in YouTube, keep on pause toggle */}
                <div id="more-menu-wrap" className="relative">
                  <CtrlBtn onClick={() => { setMenuOpen(o => !o); setSpeedOpen(false) }} title="More options">
                    <MoreIcon />
                  </CtrlBtn>
                  {menuOpen && (
                    <div className="absolute bottom-10 right-0 bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[220px] z-50">

                      <MenuItem
                        icon={<CopyIcon />}
                        onClick={() => { navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${videoId}`); setMenuOpen(false) }}
                      >
                        Copy link
                      </MenuItem>

                      <MenuItem
                        icon={<ExternalIcon />}
                        onClick={() => { window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank'); setMenuOpen(false) }}
                      >
                        Open in YouTube
                      </MenuItem>

                      <div className="h-px bg-white/10 mx-3 my-1" />

                      {/* Keep controls on pause toggle */}
                      <button
                        onClick={() => setKeepOnPause(v => !v)}
                        className="w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-white/10 flex items-center gap-3 text-white/80"
                      >
                        <PinIcon />
                        <span className="flex-1">Show controls on pause</span>
                        {/* Toggle pill */}
                        <div className={`relative w-8 h-4 rounded-full transition-colors ${keepOnPause ? 'bg-white' : 'bg-white/20'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all ${keepOnPause ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                      </button>

                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
    </div>
  )
}

// ── Menu item ─────────────────────────────────────────────────
function MenuItem({ children, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-white/10 flex items-center gap-3 text-white/80"
    >
      <span className="w-4 h-4 shrink-0 opacity-60">{icon}</span>
      {children}
    </button>
  )
}

// ── Shared button ─────────────────────────────────────────────
function CtrlBtn({ children, onClick, title, className = '' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-transparent border-0 cursor-pointer rounded-full p-0 hover:bg-white/10 transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

// ── Icons ─────────────────────────────────────────────────────
function LoopIcon({ active }) {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M17 2l4 4-4 4" stroke={active ? '#fff' : 'rgba(255,255,255,.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={active ? '#fff' : 'rgba(255,255,255,.45)'} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M7 22l-4-4 4-4" stroke={active ? '#fff' : 'rgba(255,255,255,.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={active ? '#fff' : 'rgba(255,255,255,.45)'} strokeWidth="1.8" strokeLinecap="round"/>
      {active && <circle cx="12" cy="12" r="2" fill="#fff"/>}
    </svg>
  )
}

function SkipBackIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" fill="#fff"/>
    </svg>
  )
}

function SkipFwdIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 4V1l4 4-4 4V6C8.69 6 6 8.69 6 12s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" fill="#fff"/>
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#fff"/>
      <path d="M16.5 12A4.5 4.5 0 0014 8v8a4.48 4.48 0 002.5-4z" fill="#fff"/>
      <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" fill="#fff"/>
    </svg>
  )
}

function MuteIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M16.5 12A4.5 4.5 0 0014 8v2.18l2.45 2.45c.05-.2.05-.42.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0017.73 19l2 2L21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="#fff"/>
    </svg>
  )
}

function SubtitlesIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7v2H5v-2H3V9h6v2zm8 0h-2v2h-2v-2h-2V9h6v2z" fill="#fff" fillOpacity=".7"/>
    </svg>
  )
}

function SpeedIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44z" fill="#fff"/>
      <path d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z" fill="#fff"/>
    </svg>
  )
}

function FsIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="#fff"/>
    </svg>
  )
}

function ExitFsIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" fill="#fff"/>
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.5" fill="#fff"/>
      <circle cx="12" cy="12" r="1.5" fill="#fff"/>
      <circle cx="12" cy="19" r="1.5" fill="#fff"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="#fff" strokeWidth="1.8"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#fff" strokeWidth="1.8"/>
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="15,3 21,3 21,9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="10" y1="14" x2="21" y2="3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none">
      <path d="M12 2a7 7 0 0 1 7 7c0 4-7 13-7 13S5 13 5 9a7 7 0 0 1 7-7z" stroke="#fff" strokeWidth="1.8"/>
      <circle cx="12" cy="9" r="2.5" stroke="#fff" strokeWidth="1.8"/>
    </svg>
  )
}
