import { useState } from 'react'
import { extractVideoId } from '../utils/youtube.js'

const EXAMPLES = [
  { label: 'Rick Astley', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { label: 'Gangnam Style', url: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
]

export default function InputPage({ onPlay }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)

  function handlePlay() {
    const id = extractVideoId(url)
    if (!id) { setError(true); return }
    setError(false)
    onPlay(id)
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-[560px] flex flex-col gap-4">

        <div className="flex gap-2.5">
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(false) }}
            onKeyDown={e => e.key === 'Enter' && handlePlay()}
            placeholder="https://www.youtube.com/watch?v=…"
            autoComplete="off"
            spellCheck="false"
            className="flex-1 bg-white/[.07] border border-white/[.12] rounded-full text-white text-sm px-5 py-3 outline-none transition-colors focus:border-white/35"
          />
          <button
            onClick={handlePlay}
            className="bg-white text-black rounded-full text-sm font-semibold px-6 py-3 cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity"
          >
            Play
          </button>
        </div>

        {error && (
          <p className="text-[#ff6b6b] text-xs pl-2">Please enter a valid YouTube URL.</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/60">Try:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              onClick={() => { setUrl(ex.url); onPlay(extractVideoId(ex.url)) }}
              className="border border-white/15 rounded-full text-white/60 text-xs px-3 py-1 cursor-pointer hover:border-white/40 hover:text-white transition-all"
            >
              {ex.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
