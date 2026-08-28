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

    const { error } = await supabase.from('tickets').insert({
      name: '',
      email: '',
      problem,
      status: 'New',
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
      // Ticket is already saved in the database even if the email fails,
      // so we don't block the user on this — just log it.
      console.warn('Ticket saved, but email notification failed:', err)
    }

    setStatus('done')
    setProblem('')
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center gap-6 bg-slate-50 px-4 py-8 flex-wrap">
        <PublicStatusSummary />
        <div className="bg-white shadow-md rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-800 mb-2">Ticket Submitted ✅</h1>
          <p className="text-slate-500">
            The IT team has been notified. Someone will follow up with you shortly.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center gap-6 bg-slate-50 px-4 py-8 flex-wrap">
      <PublicStatusSummary />
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md space-y-5"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">IT Help Desk</h1>
          <p className="text-slate-500 text-sm mt-1">
            Submit a ticket and we'll get back to you.
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
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            placeholder="Describe what's happening..."
          />
        </div>

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {status === 'sending' ? 'Submitting...' : 'Submit'}
        </button>

        {status === 'error' && (
          <p className="text-red-500 text-sm text-center">
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </div>
  )
}
