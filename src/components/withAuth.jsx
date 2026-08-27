import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Login from './Login'

// Set this to your school's Google Workspace domain.
// Anyone signing in with a Google account outside this domain will be blocked.
const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'yourschool.org'

export function withAuth(Component) {
  return function Wrapped(props) {
    const [session, setSession] = useState(undefined) // undefined = still loading

    useEffect(() => {
      supabase.auth.getSession().then(({ data }) => setSession(data.session))

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

      return () => listener.subscription.unsubscribe()
    }, [])

    if (session === undefined) {
      return (
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Loading…
        </div>
      )
    }

    if (!session) {
      return <Login />
    }

    const email = session.user.email || ''
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return (
        <div className="min-h-screen flex items-center justify-center text-center px-4">
          <div>
            <p className="text-slate-700 font-medium mb-2">Access restricted</p>
            <p className="text-slate-500 text-sm mb-4">
              This dashboard is only available to @{ALLOWED_DOMAIN} accounts.
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-blue-600 text-sm underline"
            >
              Sign out
            </button>
          </div>
        </div>
      )
    }

    return <Component {...props} session={session} />
  }
}
