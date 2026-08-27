import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ListView from './ListView'
import KanbanView from './KanbanView'

export default function ITDashboard({ session }) {
  const [view, setView] = useState('kanban')
  const [tickets, setTickets] = useState([])
  const [groups, setGroups] = useState([])

  useEffect(() => {
    fetchAll()

    const ticketSub = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
      .subscribe()

    const groupSub = supabase
      .channel('groups-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_groups' },
        fetchGroups
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ticketSub)
      supabase.removeChannel(groupSub)
    }
  }, [])

  const fetchAll = () => {
    fetchTickets()
    fetchGroups()
  }

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    setTickets(data || [])
  }

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('ticket_groups')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) console.error(error)
    setGroups(data || [])
  }

  const updateTicketStatus = async (ticketId, newStatus) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId)
    if (error) console.error(error)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">IT Ticket Dashboard</h1>
          {session?.user?.email && (
            <p className="text-xs text-slate-400 mt-0.5">Signed in as {session.user.email}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                view === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                view === 'kanban' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Kanban View
            </button>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-slate-400 hover:text-slate-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="w-full px-4 py-6">
        {view === 'list' ? (
          <ListView
            tickets={tickets}
            groups={groups}
            onGroupsChange={fetchGroups}
            onStatusChange={updateTicketStatus}
          />
        ) : (
          <KanbanView tickets={tickets} groups={groups} onStatusChange={updateTicketStatus} />
        )}
      </main>
    </div>
  )
}
