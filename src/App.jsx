import { useState } from 'react'
import InputPage from './pages/InputPage.jsx'
import PlayerPage from './pages/PlayerPage.jsx'

export default function App() {
  const [videoId, setVideoId] = useState(null)

  return (
    <div className="bg-[#111] text-white antialiased min-h-screen">
      {videoId
        ? <PlayerPage videoId={videoId} onBack={() => setVideoId(null)} />
        : <InputPage onPlay={setVideoId} />
      }
    </div>
  )
}
