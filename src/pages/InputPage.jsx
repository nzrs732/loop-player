import { useState, useEffect } from 'react'
import { extractVideoId } from '../utils/youtube.js'
import { useAuth } from '../context/AuthContext.jsx'
import AuthButton from '../components/AuthButton.jsx'

function randomSeed() {
  return Math.floor(Math.random() * 10000)
}

function bgUrl(seed) {
  return `https://picsum.photos/seed/${seed}/1920/1080`
}

export default function InputPage({ onPlay, onOpenLibrary }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)
  const { isSignedIn } = useAuth()

  // Crossfade slideshow — two image slots, alternate between them
  const [seeds] = useState(() => [randomSeed(), randomSeed()])
  const [slots, setSlots] = useState(() => [bgUrl(seeds[0]), bgUrl(seeds[1])])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      const next = 1 - active
      setSlots(prev => {
        const updated = [...prev]
        updated[next] = bgUrl(randomSeed())
        return updated
      })
      setActive(next)
    }, 5000)
    return () => clearInterval(id)
  }, [active])

  function handlePlay() {
    const id = extractVideoId(url)
    if (!id) { setError(true); return }
    setError(false)
    onPlay(id)
  }

  return (
    <div className="relative overflow-hidden min-h-screen">

      {/* Background slideshow */}
      {[0, 1].map(i => (
        <img
          key={i}
          src={slots[i]}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ease-in-out ${i === active ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Top-right: account (when signed in) */}
      {isSignedIn && (
        <div className="absolute top-5 right-5 z-20">
          <AuthButton />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-[560px]">

          <div className="relative">
            <div className="flex gap-2.5">
              <input
                id="url-input"
                type="text"
                value={url}
                onChange={e => { setUrl(e.target.value); setError(false) }}
                onKeyDown={e => e.key === 'Enter' && handlePlay()}
                placeholder="Paste a YouTube link and let it loop…"
                autoComplete="off"
                spellCheck="false"
                className="flex-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm px-5 py-3 outline-none transition-colors focus:border-white/25 focus:bg-black/50"
              />
              <button
                onClick={handlePlay}
                className="bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 text-white rounded-full text-sm font-semibold px-6 py-3 cursor-pointer whitespace-nowrap transition-colors"
              >
                Play
              </button>
            </div>

            <p className={`absolute top-full left-0 right-0 mt-2 text-[#ff6b6b] text-xs text-center transition-opacity duration-150 ${error ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              Please enter a valid YouTube URL.
            </p>
          </div>

        </div>
      </div>

      {/* Bottom-center: sign-in (only when signed out) */}
      {!isSignedIn && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
          <AuthButton />
        </div>
      )}

    </div>
  )
}
