import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TicketCard from './TicketCard'
import { hexToRgba } from '../lib/colors'
import { useMultiSelect } from '../hooks/useMultiSelect'
import { cleanDragStart } from '../lib/dragHelpers'
import { supabase } from '../supabaseClient'

export default function KanbanView({
  tickets,
  groups,
  category, // 'All' | 'School' | 'Parish'
  onStatusChange,
  onNotesChange,
  onFieldsChange,
  onDeleteTicket,
  onAddTicket,
  getFieldsFor,
}) {
  const { selected, handleSelect, clearSelection } = useMultiSelect()
  const [draggedGroupId, setDraggedGroupId] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const orderedIds = tickets.map((t) => t.id)

  const bulkDelete = () => {
    if (!window.confirm(`Delete ${selected.length} selected request(s)? This can't be undone.`)) return
    selected.forEach((id) => onDeleteTicket(id))
    clearSelection()
  }

  const handleColumnDrop = async (targetGroup) => {
    if (!draggedGroupId || draggedGroupId === targetGroup.id) return
    const dragIndex = groups.findIndex((g) => g.id === draggedGroupId)
    const targetIndex = groups.findIndex((g) => g.id === targetGroup.id)
    const reordered = [...groups]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    await Promise.all(
      reordered.map((g, i) => supabase.from('ticket_groups').update({ sort_order: i }).eq('id', g.id))
    )
    setDraggedGroupId(null)
  }

  const rows =
    category === 'All'
      ? [
          { label: 'School', filterCategory: 'School' },
          { label: 'Parish', filterCategory: 'Parish' },
        ]
      : [{ label: category, filterCategory: category }]

  return (
    <div className="space-y-6">
      {selected.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            {selected.length} selected
          </span>
          <button onClick={bulkDelete} className="text-red-500 hover:text-red-700 underline">
            Delete selected
          </button>
          <button onClick={clearSelection} className="text-slate-500 hover:text-slate-800 underline">
            Deselect all
          </button>
        </div>
      )}

      {rows.map((row) => {
        const rowTickets = tickets.filter((t) => (t.category || 'School') === row.filterCategory)
        return (
          <div key={row.label}>
            {category === 'All' && (
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: row.label === 'Parish' ? '#C7A9DC22' : '#8FB4DB22',
                    color: row.label === 'Parish' ? '#C7A9DC' : '#8FB4DB',
                  }}
                >
                  {row.label}
                </span>
              </div>
            )}

            <div className="w-full flex gap-4 overflow-x-auto pb-4">
              {groups.map((group) => {
                const groupTickets = rowTickets.filter((t) => t.status === group.name)

                const handleCardDrop = (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const ids = selected.length > 0 ? selected : [e.dataTransfer.getData('ticketId')]
                  ids.filter(Boolean).forEach((id) => onStatusChange(id, group.name))
                  clearSelection()
                  setDraggingId(null)
                }

                return (
                  <motion.div
                    layout
                    transition={{ duration: 0.2 }}
                    key={group.id}
                    draggable
                    onDragStart={() => setDraggedGroupId(group.id)}
                    onDragEnd={() => setDraggedGroupId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      if (draggedGroupId) {
                        handleColumnDrop(group)
                      } else {
                        handleCardDrop(e)
                      }
                    }}
                    className="flex-1 min-w-[280px] rounded-xl p-3 transition-shadow"
                    style={{ backgroundColor: hexToRgba(group.color, 0.1) }}
                  >
                    <div
                      className="flex items-center justify-between mb-3 px-1 cursor-grab active:cursor-grabbing"
                      title="Drag to reorder column"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                        <h2 className="font-semibold text-slate-700">{group.name}</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: hexToRgba(group.color, 0.25), color: '#334155' }}
                        >
                          {groupTickets.length}
                        </span>
                        <button
                          onClick={() => setAddingTo(`${row.filterCategory}:${group.name}`)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-300 bg-white rounded-full px-2 py-0.5"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {addingTo === `${row.filterCategory}:${group.name}` && (
                      <div className="bg-white rounded-lg p-2 mb-2 shadow-sm border border-slate-200">
                        <MiniAddForm
                          defaultCategory={row.filterCategory}
                          onCancel={() => setAddingTo(null)}
                          onSubmit={(data) => {
                            onAddTicket({ ...data, status: group.name })
                            setAddingTo(null)
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-3" onDragOver={(e) => e.stopPropagation()}>
                      <AnimatePresence>
                        {groupTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              cleanDragStart(e)
                              e.dataTransfer.setData('ticketId', ticket.id)
                              setDraggingId(ticket.id)
                            }}
                            onDragEnd={() => setDraggingId(null)}
                            className={draggingId === ticket.id ? 'opacity-40' : ''}
                          >
                            <TicketCard
                              ticket={ticket}
                              groups={groups}
                              onStatusChange={onStatusChange}
                              onNotesChange={onNotesChange}
                              onFieldsChange={onFieldsChange}
                              onDelete={onDeleteTicket}
                              selected={selected.includes(ticket.id)}
                              onSelect={(id, e) => handleSelect(id, e, orderedIds)}
                              visibleFields={getFieldsFor(ticket.category || 'School')}
                            />
                          </div>
                        ))}
                      </AnimatePresence>
                      {groupTickets.length === 0 && (
                        <p className="text-xs text-slate-400 px-1">Drop tickets here</p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MiniAddForm({ onSubmit, onCancel, defaultCategory = 'School' }) {
  const [name, setName] = useState('')
  const [problem, setProblem] = useState('')
  const [category, setCategory] = useState(defaultCategory)

  const submit = () => {
    if (!name.trim() || !problem.trim()) return
    onSubmit({ name, email: '', problem, category })
  }

  return (
    <div className="space-y-1.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs"
      />
      <textarea
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="Issue"
        rows={2}
        className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs resize-none"
      />
      <div className="flex items-center justify-between">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-slate-200 rounded-md px-1 py-0.5 text-[11px]"
        >
          <option value="School">School</option>
          <option value="Parish">Parish</option>
        </select>
        <div className="flex gap-1">
          <button onClick={onCancel} className="text-[11px] text-slate-500 px-1.5">
            Cancel
          </button>
          <button onClick={submit} className="text-[11px] bg-slate-800 text-white rounded px-2 py-1">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}