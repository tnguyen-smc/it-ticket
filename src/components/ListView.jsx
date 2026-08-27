import { useState } from 'react'
import TicketCard from './TicketCard'
import GroupManager from './GroupManager'

export default function ListView({ tickets, groups, onGroupsChange, onStatusChange }) {
  const [managingGroups, setManagingGroups] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setManagingGroups(true)}
          className="text-sm px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Manage Groups
        </button>
      </div>

      {managingGroups && (
        <GroupManager
          groups={groups}
          onClose={() => setManagingGroups(false)}
          onGroupsChange={onGroupsChange}
        />
      )}

      <div className="space-y-6">
        {groups.map((group) => {
          const groupTickets = tickets.filter((t) => t.status === group.name)
          return (
            <div key={group.id} className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700">{group.name}</h2>
                <span className="text-xs text-slate-400">{groupTickets.length} tickets</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupTickets.length === 0 && (
                  <p className="text-sm text-slate-400 col-span-full">No tickets in this group.</p>
                )}
                {groupTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    groups={groups}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
