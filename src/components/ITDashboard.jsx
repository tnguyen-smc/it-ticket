import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ListView from './ListView'
import KanbanView from './KanbanView'
import BoardView from './BoardView'
import Sidebar from './Sidebar'
import SettingsPanel from './SettingsPanel'
import { useDisplaySettings } from '../hooks/useDisplaySettings'

export default function ITDashboard({ session }) {
  const [view, setView] = useState('kanban') // 'list' | 'kanban' | 'board' | 'settings'
  const [category, setCategory] = useState('All') // 'All' | 'School' | 'Parish'
  const [tickets, setTickets] = useState([])
  const [groups, setGroups] = useState([])
  const { settings, update: updateDisplaySetting, getFieldsFor } = useDisplaySettings()

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
    // Optimistic update: reflect the change instantly instead of waiting on
    // the round trip to Supabase + realtime, which was causing a visible
    // delay and a "choppy" resize of the groups/columns.
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)))
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId)
    if (error) {
      console.error(error)
      fetchTickets() // roll back to server state if the update actually failed
    }
  }

  const updateTicketNotes = async (ticketId, notes) => {
    const { error } = await supabase.from('tickets').update({ notes }).eq('id', ticketId)
    if (error) console.error(error)
  }

  const updateTicketFields = async (ticketId, fields) => {
    const { error } = await supabase.from('tickets').update(fields).eq('id', ticketId)
    if (error) console.error(error)
  }

  const deleteTicket = async (ticketId) => {
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId)
    if (error) console.error(error)
  }

  const addTicket = async ({ name, email, problem, status, category: cat }) => {
    const { error } = await supabase.from('tickets').insert({
      name,
      email: email || '',
      problem,
      status,
      category: cat || 'School',
      created_at: new Date().toISOString(),
    })
    if (error) console.error(error)
  }

  const filteredTickets =
    category === 'All' ? tickets : tickets.filter((t) => (t.category || 'School') === category)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header
        className="border-b border-black/10 px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#5C8768' }}
      >
        <div className="flex items-center gap-3">
          <img src="public/School-logo.png" alt="" className="h-9 w-9 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-0.5">
              St. Mary Catholic School
            </p>
            <h1 className="text-xl font-semibold text-white">IT Dashboard</h1>
            {session?.user?.email && (
              <p className="text-xs text-white/70 mt-0.5">Signed in as {session.user.email}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white/15 rounded-lg p-1">
            {['list', 'kanban', 'board'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                  view === v ? 'bg-white text-slate-900 shadow' : 'text-white/80'
                }`}
              >
                {v === 'board' ? 'Thought Board' : v}
              </button>
            ))}
            <button
              onClick={() => setView('settings')}
              title="Display settings"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                view === 'settings' ? 'bg-white text-slate-900 shadow' : 'text-white/80'
              }`}
            >
              ⚙️
            </button>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-white/70 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* School / Parish divider — hidden on the Thought Board, which is personal/unfiled */}
      {view !== 'board' && view !== 'settings' && (
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Showing:</span>
          {['All', 'School', 'Parish'].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-xs font-medium px-3 py-1 rounded-full transition ${
                category === c
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {(view === 'list' || view === 'kanban') && (
          <Sidebar tickets={filteredTickets} groups={groups} />
        )}

        <main className="flex-1 px-4 py-6 overflow-auto">
          {view === 'list' && (
            <ListView
              tickets={filteredTickets}
              groups={groups}
              onGroupsChange={fetchGroups}
              onStatusChange={updateTicketStatus}
              onNotesChange={updateTicketNotes}
              onFieldsChange={updateTicketFields}
              onDeleteTicket={deleteTicket}
              onAddTicket={addTicket}
              getFieldsFor={getFieldsFor}
            />
          )}
          {view === 'kanban' && (
            <KanbanView
              tickets={filteredTickets}
              groups={groups}
              category={category}
              onStatusChange={updateTicketStatus}
              onNotesChange={updateTicketNotes}
              onFieldsChange={updateTicketFields}
              onDeleteTicket={deleteTicket}
              onAddTicket={addTicket}
              getFieldsFor={getFieldsFor}
            />
          )}
          {view === 'board' && <BoardView />}
          {view === 'settings' && (
            <SettingsPanel settings={settings} onUpdate={updateDisplaySetting} />
          )}
        </main>
      </div>
    </div>
  )
}