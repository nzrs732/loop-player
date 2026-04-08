import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import InputPage from './pages/InputPage.jsx'
import PlayerPage from './pages/PlayerPage.jsx'
import LibraryPanel from './components/LibraryPanel.jsx'
import AuthButton from './components/AuthButton.jsx'

function AppContent() {
  const { isSignedIn } = useAuth()

  // URL-synced video state — reads ?v= on mount
  const [videoId, setVideoId] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('v') || null
  })
  const [libraryOpen, setLibraryOpen] = useState(false)

  function navigate(id) {
    const url = id ? `?v=${id}` : window.location.pathname
    window.history.pushState({}, '', url)
    setVideoId(id)
  }

  // Browser back / forward
  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search)
      setVideoId(params.get('v') || null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Auto-open library on sign-in and when entering player
  useEffect(() => {
    if (isSignedIn) setLibraryOpen(true)
  }, [isSignedIn])

  useEffect(() => {
    if (videoId) setLibraryOpen(true)
  }, [videoId])

  if (videoId) {
    return (
      <div className="relative h-screen overflow-hidden flex items-center p-3 sm:p-5 gap-3 sm:gap-5">
        <LibraryPanel
          sidebar
          open={libraryOpen}
          onOpen={() => setLibraryOpen(true)}
          onClose={() => setLibraryOpen(false)}
          onPlay={(id) => navigate(id)}
        />
        <PlayerPage
          videoId={videoId}
          onBack={() => navigate(null)}
          onOpenLibrary={() => setLibraryOpen(true)}
          libraryOpen={libraryOpen}
        />
        {/* Account button — top-right */}
        <div className="absolute top-5 right-5 z-50">
          <AuthButton />
        </div>
      </div>
    )
  }

  return (
    <>
      <InputPage
        onPlay={(id) => navigate(id)}
        onOpenLibrary={() => setLibraryOpen(true)}
      />
      <LibraryPanel
        open={libraryOpen}
        onOpen={() => setLibraryOpen(true)}
        onClose={() => setLibraryOpen(false)}
        onPlay={(id) => navigate(id)}
      />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <div className="bg-[#111] text-white antialiased min-h-screen">
        <AppContent />
      </div>
    </AuthProvider>
  )
}
