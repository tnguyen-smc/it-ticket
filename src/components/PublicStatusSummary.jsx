import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { hexToRgba } from '../lib/colors'

// Read-only mirror of the admin "Quick Status" panel. Which statuses appear here
// is controlled entirely by admins (ticket_groups.show_in_summary) — the public
// can't configure it. Only problem text ("title") is shown; internal notes are
// never fetched or displayed here.
export default function PublicStatusSummary() {
  const [groups, setGroups] = useState([])
  const [tickets, setTickets] = useState([])

  useEffect(() => {
    fetchData()

    const sub = supabase
      .channel('public-status-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchData)
      .subscribe()

    const groupSub = supabase
      .channel('public-status-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_groups' }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
      supabase.removeChannel(groupSub)
    }
  }, [])

  const fetchData = async () => {
    const { data: groupData } = await supabase
      .from('ticket_groups')
      .select('*')
      .order('sort_order', { ascending: true })
    setGroups(groupData || [])

    // Only select the fields we intend to show publicly — notes is deliberately excluded
    const { data: ticketData } = await supabase.from('tickets').select('id, status, problem')
    setTickets(ticketData || [])
  }

  const visibleGroups = groups.filter((g) => g.show_in_summary)
  if (visibleGroups.length === 0) return null

  return (
    <div className="bg-white shadow-md rounded-2xl p-6 w-full max-w-xs">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">Current Queue</h2>
      <p className="text-xs text-slate-400 mb-4">A quick look at what's in progress.</p>

      <div className="space-y-4">
        {visibleGroups.map((group) => {
          const groupTickets = tickets.filter((t) => t.status === group.name)
          return (
            <div key={group.id}>
              <div
                className="flex items-center justify-between px-2 py-1.5 rounded-lg mb-1.5"
                style={{ backgroundColor: hexToRgba(group.color, 0.15) }}
              >
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                  {group.name}
                </span>
                <span className="text-xs text-slate-500">{groupTickets.length}</span>
              </div>
              <div className="space-y-1">
                {groupTickets.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="text-xs text-slate-600 px-2 py-1 rounded hover:bg-slate-50 truncate"
                    title={t.problem}
                  >
                    {t.problem}
                  </div>
                ))}
                {groupTickets.length === 0 && (
                  <p className="text-xs text-slate-300 px-2">Nothing here</p>
                )}
                {groupTickets.length > 6 && (
                  <p className="text-xs text-slate-400 px-2">+{groupTickets.length - 6} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
