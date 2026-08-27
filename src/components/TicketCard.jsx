export default function TicketCard({ ticket, groups, onStatusChange }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 cursor-grab active:cursor-grabbing">
      <p className="font-medium text-slate-800 text-sm">{ticket.name}</p>
      <p className="text-xs text-slate-400 mb-2">{ticket.email}</p>
      <p className="text-sm text-slate-600 line-clamp-3 mb-2">{ticket.problem}</p>
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>{new Date(ticket.created_at).toLocaleString()}</span>
      </div>
      <select
        value={ticket.status}
        onChange={(e) => onStatusChange(ticket.id, e.target.value)}
        className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50"
      >
        {groups.map((g) => (
          <option key={g.id} value={g.name}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  )
}
