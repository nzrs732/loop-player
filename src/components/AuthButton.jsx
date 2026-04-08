import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthButton() {
  const { isSignedIn, user, loading, gisReady, signIn, signOut, scopeError } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false)
    }
    const id = setTimeout(() => document.addEventListener('mousedown', onClick), 50)
    return () => { clearTimeout(id); document.removeEventListener('mousedown', onClick) }
  }, [menuOpen])

  if (loading) {
    return (
      <button disabled className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-semibold px-5 py-2.5 opacity-60 cursor-default">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        Signing in…
      </button>
    )
  }

  // User skipped the YouTube checkbox — show a warning with retry
  if (scopeError) {
    return (
      <div ref={wrapRef} className="flex flex-col items-end gap-2">
        <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 max-w-[280px] shadow-2xl">
          <p className="text-[13px] font-semibold text-white mb-1">YouTube access required</p>
          <p className="text-[11px] text-white/50 leading-relaxed mb-3">
            Please check <span className="text-white/80 font-medium">"View your YouTube account"</span> on the next screen to use your library.
          </p>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white text-xs font-semibold px-4 py-2 cursor-pointer transition-colors"
          >
            <GoogleIcon />
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (isSignedIn) {
    return (
      <div ref={wrapRef} className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full pl-1.5 pr-4 py-2 cursor-pointer transition-colors"
          title="Account"
        >
          {user?.picture
            ? <img src={user.picture} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
            : <AvatarFallback />
          }
          <span className="text-sm font-semibold text-white max-w-[140px] truncate">
            {user?.name ?? 'Account'}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 mt-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[260px] z-50">

            {/* Account info block */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              {user?.picture
                ? <img src={user.picture} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                : <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"><AvatarFallback /></div>
              }
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name ?? '—'}</p>
                {user?.email && (
                  <p className="text-[11px] text-white/50 truncate mt-0.5">{user.email}</p>
                )}
              </div>
            </div>

            <div className="h-px bg-white/10 mx-3 my-1" />

            {/* Sign out */}
            <button
              onClick={() => { signOut(); setMenuOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-white/10 flex items-center gap-3 text-white/80"
            >
              <span className="w-4 h-4 shrink-0 opacity-60"><SignOutIcon /></span>
              Sign out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={gisReady ? signIn : undefined}
      disabled={!gisReady}
      className={`flex items-center gap-2.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-semibold px-6 py-3 transition-colors whitespace-nowrap ${gisReady ? 'hover:bg-black/60 cursor-pointer' : 'opacity-50 cursor-default'}`}
    >
      <GoogleIcon />
      Sign in with Google
    </button>
  )
}

function AvatarFallback() {
  return (
    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="#fff" strokeWidth="1.8"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16,17 21,12 16,7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
