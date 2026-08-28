import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TicketCard from './TicketCard'
import GroupManager from './GroupManager'
import { hexToRgba } from '../lib/colors'
import { useMultiSelect } from '../hooks/useMultiSelect'

export default function ListView({ tickets, groups, onGroupsChange, onStatusChange, onNotesChange, onDeleteTicket, onAddTicket }) {
  const [managingGroups, setManagingGroups] = useState(false)
  const [addingTo, setAddingTo] = useState(null)
  const { selected, handleSelect, clearSelection } = useMultiSelect()

  const orderedIds = tickets.map((t) => t.id)

  const handleDrop = (e, status) => {
    e.preventDefault()
    const ids = selected.length > 0 ? selected : [e.dataTransfer.getData('ticketId')]
    ids.filter(Boolean).forEach((id) => onStatusChange(id, status))
    clearSelection()
  }

  const bulkDelete = () => {
    if (!window.confirm(`Delete ${selected.length} selected request(s)? This can't be undone.`)) return
    selected.forEach((id) => onDeleteTicket(id))
    clearSelection()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        {selected.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              {selected.length} selected
            </span>
            <button
              onClick={bulkDelete}
              className="text-red-500 hover:text-red-700 underline"
            >
              Delete selected
            </button>
            <button
              onClick={clearSelection}
              className="text-slate-500 hover:text-slate-800 underline"
            >
              Deselect all
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Click a card to select · Shift+click to select a range · Drag cards between groups
          </p>
        )}
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
            <div
              key={group.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, group.name)}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              style={{ borderTop: `3px solid ${group.color}` }}
            >
              <div
                className="px-4 py-3 flex justify-between items-center"
                style={{ backgroundColor: hexToRgba(group.color, 0.12) }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <h2 className="font-semibold text-slate-700">{group.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{groupTickets.length} tickets</span>
                  <button
                    onClick={() => setAddingTo(group.name)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-300 bg-white rounded-full px-2.5 py-1"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {addingTo === group.name && (
                <QuickAddForm
                  onCancel={() => setAddingTo(null)}
                  onSubmit={(data) => {
                    onAddTicket({ ...data, status: group.name })
                    setAddingTo(null)
                  }}
                />
              )}

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>
                  {groupTickets.length === 0 && (
                    <p className="text-sm text-slate-400 col-span-full">No tickets in this group.</p>
                  )}
                  {groupTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('ticketId', ticket.id)}
                    >
                      <TicketCard
                        ticket={ticket}
                        groups={groups}
                        onStatusChange={onStatusChange}
                        onNotesChange={onNotesChange}
                        onDelete={onDeleteTicket}
                        selected={selected.includes(ticket.id)}
                        onSelect={(id, e) => handleSelect(id, e, orderedIds)}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuickAddForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [problem, setProblem] = useState('')
  const [category, setCategory] = useState('School')

  const submit = () => {
    if (!name.trim() || !problem.trim()) return
    onSubmit({ name, email, problem, category })
  }

  return (
    <div className="px-4 pb-4 pt-1 bg-slate-50 border-b border-slate-100 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="border border-slate-200 rounded-md px-2 py-1.5 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="border border-slate-200 rounded-md px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="What's the issue?"
        rows={2}
        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm resize-none"
      />
      <div className="flex items-center justify-between">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-slate-200 rounded-md px-2 py-1 text-xs"
        >
          <option value="School">School</option>
          <option value="Parish">Parish</option>
        </select>
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-xs text-slate-500 px-2 py-1">
            Cancel
          </button>
          <button
            onClick={submit}
            className="text-xs bg-slate-800 text-white rounded-md px-3 py-1.5"
          >
            Add Ticket
          </button>
        </div>
      </div>
    </div>
  )
}
