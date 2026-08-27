import TicketCard from './TicketCard'

export default function KanbanView({ tickets, groups, onStatusChange }) {
  const handleDrop = (e, status) => {
    e.preventDefault()
    const ticketId = e.dataTransfer.getData('ticketId')
    if (ticketId) onStatusChange(ticketId, status)
  }

  return (
    <div className="w-full flex gap-4 overflow-x-auto pb-4">
      {groups.map((group) => {
        const groupTickets = tickets.filter((t) => t.status === group.name)
        return (
          <div
            key={group.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, group.name)}
            className="flex-1 min-w-[280px] bg-slate-100 rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="font-semibold text-slate-700">{group.name}</h2>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {groupTickets.length}
              </span>
            </div>
            <div className="space-y-3">
              {groupTickets.length === 0 && (
                <p className="text-xs text-slate-400 px-1">Drop tickets here</p>
              )}
              {groupTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('ticketId', ticket.id)}
                >
                  <TicketCard ticket={ticket} groups={groups} onStatusChange={onStatusChange} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
