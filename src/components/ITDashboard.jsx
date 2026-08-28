import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ListView from './ListView'
import KanbanView from './KanbanView'
import BoardView from './BoardView'
import Sidebar from './Sidebar'
import SettingsPanel from './SettingsPanel'
import { useDisplaySettings } from '../hooks/useDisplaySettings'
import { useAppSettings } from '../hooks/useAppSettings'

export default function ITDashboard({ session }) {
  const [view, setView] = useState('kanban')
  const [category, setCategory] = useState('All')
  const [tickets, setTickets] = useState([])
  const [groups, setGroups] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const { settings, update: updateDisplaySetting, getFieldsFor } = useDisplaySettings()
  const { settings: appSettings, update: updateAppSettings } = useAppSettings()

  useEffect(() => {
    fetchAll()

    const ticketSub = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
      .subscribe()

    const groupSub = supabase
      .channel('groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_groups' }, fetchGroups)
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
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)))
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', ticketId)
    if (error) {
      console.error(error)
      fetchTickets()
    }
  }

  const updateTicketNotes = async (ticketId, notes) => {
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, notes } : t)))
    const { error } = await supabase.from('tickets').update({ notes }).eq('id', ticketId)
    if (error) {
      console.error(error)
      fetchTickets()
    }
  }

  const updateTicketFields = async (ticketId, fields) => {
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...fields } : t)))
    const { error } = await supabase.from('tickets').update(fields).eq('id', ticketId)
    if (error) {
      console.error(error)
      fetchTickets()
    }
  }

  const archiveTicket = async (ticketId) => {
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, archived: true } : t)))
    const { error } = await supabase.from('tickets').update({ archived: true }).eq('id', ticketId)
    if (error) console.error(error)
  }

  const restoreTicket = async (ticketId) => {
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, archived: false } : t)))
    const { error } = await supabase.from('tickets').update({ archived: false }).eq('id', ticketId)
    if (error) console.error(error)
  }

  const deleteTicketPermanently = async (ticketId) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId))
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

  const activeTickets = tickets.filter((t) => !t.archived)
  const archivedTickets = tickets.filter((t) => t.archived)

  const filteredTickets =
    category === 'All'
      ? activeTickets
      : activeTickets.filter((t) => (t.category || 'School') === category)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header
        className="border-b border-black/10 px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#5C8768' }}
      >
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}School-logo.png`}
            alt=""
            className="h-11 w-auto flex-shrink-0"
          />
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

        <img
          src={`${import.meta.env.BASE_URL}Holy-Family.png`}
          alt=""
          className="h-10 w-auto flex-shrink-0 hidden md:block"
        />

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
                {v === 'board' ? 'Big Brain' : v}
              </button>
            ))}
            <button
              onClick={() => setView('settings')}
              title="Display settings"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center justify-center ${
                view === 'settings' ? 'bg-white text-slate-900 shadow' : 'text-white/80'
              }`}
            >
              <GearIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowArchived(true)}
            className="text-sm text-white/80 hover:text-white"
          >
            Archived {archivedTickets.length > 0 && `(${archivedTickets.length})`}
          </button>

          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-white/70 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

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
              sortMode={appSettings.sortMode}
              onGroupsChange={fetchGroups}
              onStatusChange={updateTicketStatus}
              onNotesChange={updateTicketNotes}
              onFieldsChange={updateTicketFields}
              onArchiveTicket={archiveTicket}
              onAddTicket={addTicket}
              getFieldsFor={getFieldsFor}
            />
          )}
          {view === 'kanban' && (
            <KanbanView
              tickets={filteredTickets}
              groups={groups}
              category={category}
              sortMode={appSettings.sortMode}
              onStatusChange={updateTicketStatus}
              onNotesChange={updateTicketNotes}
              onFieldsChange={updateTicketFields}
              onArchiveTicket={archiveTicket}
              onAddTicket={addTicket}
              getFieldsFor={getFieldsFor}
            />
          )}
          {view === 'board' && <BoardView />}
          {view === 'settings' && (
            <SettingsPanel
              settings={settings}
              onUpdate={updateDisplaySetting}
              groups={groups}
              appSettings={appSettings}
              onUpdateAppSettings={updateAppSettings}
            />
          )}
        </main>
      </div>

      {showArchived && (
        <TicketArchivePanel
          tickets={archivedTickets}
          onClose={() => setShowArchived(false)}
          onRestore={restoreTicket}
          onDeletePermanently={deleteTicketPermanently}
        />
      )}
    </div>
  )
}

function GearIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function TicketArchivePanel({ tickets, onClose, onRestore, onDeletePermanently }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Archived Requests</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {tickets.length === 0 ? (
          <p className="text-sm text-slate-400">No archived requests.</p>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 truncate">{t.name || 'Anonymous request'}</p>
                  <p className="text-xs text-slate-400 truncate">{t.problem}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => onRestore(t.id)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Permanently delete this request? This can't be undone.")) {
                        onDeletePermanently(t.id)
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}