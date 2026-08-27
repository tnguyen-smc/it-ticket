import { supabase } from '../supabaseClient'

export default function Login() {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL + 'it',
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white shadow-md rounded-2xl p-8 text-center max-w-sm w-full">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">IT Staff Login</h1>
        <p className="text-slate-500 text-sm mb-6">
          Sign in with your school Google account to access the dashboard.
        </p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-2.5 hover:bg-slate-50 transition"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            className="w-5 h-5"
            alt="Google"
          />
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
