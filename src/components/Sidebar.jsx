import { useEffect, useState } from 'react'
import { hexToRgba } from '../lib/colors'

const STORAGE_KEY = 'it-dashboard-sidebar-statuses'

export default function Sidebar({ tickets, groups }) {
  const [activeStatuses, setActiveStatuses] = useState([])
  const [configuring, setConfiguring] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setActiveStatuses(JSON.parse(saved))
    } else if (groups.length > 0) {
      // Default: first two groups (typically "New" and "In Progress")
      setActiveStatuses(groups.slice(0, 2).map((g) => g.name))
    }
  }, [groups])

  const toggleStatus = (name) => {
    setActiveStatuses((prev) => {
      const next = prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const visibleGroups = groups.filter((g) => activeStatuses.includes(g.name))

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 h-full overflow-y-auto">
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Quick Status</h3>
        <button
          onClick={() => setConfiguring((c) => !c)}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          {configuring ? 'Done' : 'Configure'}
        </button>
      </div>

      {configuring && (
        <div className="p-4 border-b border-slate-100 space-y-2">
          <p className="text-xs text-slate-400 mb-2">Choose which statuses show here:</p>
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeStatuses.includes(g.name)}
                onChange={() => toggleStatus(g.name)}
                className="rounded"
              />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
              {g.name}
            </label>
          ))}
        </div>
      )}

      <div className="p-3 space-y-4">
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
                    {t.name ? `${t.name} — ` : ''}{t.problem}
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
        {visibleGroups.length === 0 && (
          <p className="text-xs text-slate-400 px-2">
            No statuses selected — click "Configure" above to choose some.
          </p>
        )}
      </div>
    </aside>
  )
}
