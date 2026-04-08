import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
const SCOPE = `${YOUTUBE_SCOPE} profile email`
const STORAGE_KEY = 'yt_auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken]           = useState(null)   // access token string
  const [user, setUser]             = useState(null)   // { name, picture, email }
  const [loading, setLoading]       = useState(false)
  const [gisReady, setGisReady]     = useState(false)
  const [scopeError, setScopeError] = useState(false)  // user skipped YouTube checkbox

  // Wait for GIS script to finish loading
  useEffect(() => {
    if (window.google?.accounts) { setGisReady(true); return }
    window.onGoogleLibraryLoad = () => setGisReady(true)
    return () => { if (window.onGoogleLibraryLoad) window.onGoogleLibraryLoad = null }
  }, [])

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { token: t, user: u, expires } = JSON.parse(saved)
        if (Date.now() < expires) {
          setToken(t)
          setUser(u ?? null)
          // If token was saved without profile info, fetch it now
          if (!u) {
            fetchProfile(t).then(profile => {
              const userData = { name: profile.name, picture: profile.picture, email: profile.email }
              setUser(userData)
              const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, user: userData }))
            }).catch(() => {})
          }
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Fetch Google profile using the access token
  async function fetchProfile(accessToken) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error('Failed to fetch profile')
    return res.json() // { name, picture, email, sub }
  }

  const signIn = useCallback(() => {
    if (!window.google) return
    setLoading(true)
    setScopeError(false)

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: async (response) => {
        if (response.error || !response.access_token) {
          setLoading(false)
          return
        }

        // Check that the user actually granted YouTube access
        const granted = window.google.accounts.oauth2.hasGrantedAllScopes(response, YOUTUBE_SCOPE)
        if (!granted) {
          setLoading(false)
          setScopeError(true)
          return
        }

        try {
          const profile = await fetchProfile(response.access_token)
          const userData = {
            name: profile.name,
            picture: profile.picture,
            email: profile.email,
          }
          const expires = Date.now() + (response.expires_in - 60) * 1000
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            token: response.access_token,
            user: userData,
            expires,
          }))
          setToken(response.access_token)
          setUser(userData)
        } catch {
          setToken(response.access_token)
        } finally {
          setLoading(false)
        }
      },
    })

    client.requestAccessToken({ prompt: 'select_account' })
  }, [])

  const signOut = useCallback(() => {
    if (token) window.google?.accounts.oauth2.revoke(token, () => {})
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
    setScopeError(false)
  }, [token])

  return (
    <AuthContext.Provider value={{ token, user, loading, gisReady, signIn, signOut, isSignedIn: !!token, scopeError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
