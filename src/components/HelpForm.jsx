import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { supabase } from '../supabaseClient'
import PublicStatusSummary from './PublicStatusSummary'

export default function HelpForm() {
  const [problem, setProblem] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    const timestamp = new Date().toISOString()

    let intakeStatus = 'New'
    const { data: settingsRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'global')
      .single()
    if (settingsRow?.value?.defaultIntakeGroup) {
      intakeStatus = settingsRow.value.defaultIntakeGroup
    }

    const { error } = await supabase.from('tickets').insert({
      name: '',
      email: '',
      problem,
      status: intakeStatus,
      created_at: timestamp,
    })

    if (error) {
      console.error(error)
      setStatus('error')
      return
    }

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_email: import.meta.env.VITE_ADMIN_EMAIL,
          problem,
          timestamp: new Date(timestamp).toLocaleString(),
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      )
    } catch (err) {
      console.warn('Ticket saved, but email notification failed:', err)
    }

    setStatus('done')
    setProblem('')
  }

  const PageShell = ({ children }) => (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 px-4 py-8"
      style={{ backgroundColor: '#E8F0E9' }}
    >
      <img
        src={`${import.meta.env.BASE_URL}Holy-Family.png`}
        alt=""
        className="h-20 sm:h-24 w-auto"
        style={{
          filter:
            'drop-shadow(0 0 10px rgba(250,204,21,0.45)) drop-shadow(0 0 22px rgba(250,204,21,0.25))',
        }}
      />
      <div className="flex items-center justify-center gap-6 flex-wrap w-full">{children}</div>
    </div>
  )

  const Logo = () => (
    <img
      src={`${import.meta.env.BASE_URL}School-logo.png`}
      alt=""
      className="h-14 w-auto mx-auto mb-3"
      style={{ filter: 'brightness(0) saturate(100%)' }}
    />
  )

  if (status === 'done') {
    return (
      <PageShell>
        <div className="order-2 sm:order-1">
          <PublicStatusSummary />
        </div>
        <div className="order-1 sm:order-2 bg-white shadow-md rounded-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <Logo />
          <h1 className="text-2xl font-semibold text-slate-800 mb-2">Ticket Submitted ✅</h1>
          <p className="text-slate-500">
            Thanks for submitting! Check request statuses on the left of request screen.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-6 px-4 py-2 text-white rounded-lg font-medium"
            style={{ backgroundColor: '#5C8768' }}
          >
            Submit Another
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="order-2 sm:order-1">
        <PublicStatusSummary />
      </div>

      <form
        onSubmit={handleSubmit}
        className="order-1 sm:order-2 bg-white shadow-md rounded-2xl p-6 sm:p-8 w-full max-w-md space-y-5"
      >
        <div className="text-center">
          <Logo />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
            St. Mary Catholic School
          </p>
          <h1 className="text-2xl font-semibold text-slate-800">IT Request</h1>
          <p className="text-slate-500 text-sm mt-1">
            Submit ticket for St. Mary Catholic School
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            How can I help?
          </label>
          <textarea
            required
            rows={7}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:outline-none resize-none"
            style={{ '--tw-ring-color': '#5C8768' }}
            placeholder="Describe what's happening..."
          />
        </div>

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full text-white py-3 sm:py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
          style={{ backgroundColor: '#5C8768' }}
        >
          {status === 'sending' ? 'Submitting...' : 'Submit'}
        </button>

        {status === 'error' && (
          <p className="text-red-500 text-sm text-center">
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </PageShell>
  )
}