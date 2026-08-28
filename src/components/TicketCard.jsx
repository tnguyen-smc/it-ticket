import { useState } from 'react'
import { motion } from 'framer-motion'
import ColorStatusSelect from './ColorStatusSelect'

export default function TicketCard({
  ticket,
  groups,
  onStatusChange,
  onNotesChange,
  onDelete,
  selected,
  onSelect,
  draggable = true,
  onDragStart,
}) {
  const categoryColor = ticket.category === 'Parish' ? '#C7A9DC' : '#8FB4DB'
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState(ticket.notes || '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const saveNotes = () => {
    if (notesDraft !== (ticket.notes || '')) {
      onNotesChange(ticket.id, notesDraft)
    }
  }

  return (
    <motion.div
      layout
      layoutId={`ticket-${ticket.id}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={(e) => onSelect && onSelect(ticket.id, e)}
      className={`relative bg-white rounded-lg shadow-sm p-3 cursor-pointer select-none transition-colors ${
        draggable ? 'active:cursor-grabbing' : ''
      } ${
        selected
          ? 'border-2 border-blue-400 ring-2 ring-blue-100'
          : 'border border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-medium text-slate-800 text-sm">{ticket.name || 'Anonymous request'}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${categoryColor}22`, color: categoryColor }}
          >
            {ticket.category || 'School'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setConfirmingDelete(true)
            }}
            className="text-slate-300 hover:text-red-500 p-0.5"
            title="Delete request"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
      {ticket.email && <p className="text-xs text-slate-400 mb-2">{ticket.email}</p>}
      <p className="text-sm text-slate-600 line-clamp-3 mb-2">{ticket.problem}</p>
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>{new Date(ticket.created_at).toLocaleString()}</span>
      </div>

      {confirmingDelete && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mb-2 bg-red-50 border border-red-200 rounded-md px-2 py-2 flex items-center justify-between gap-2"
        >
          <span className="text-xs text-red-700">Delete this request?</span>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-xs text-slate-500 px-2 py-1 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(ticket.id)}
              className="text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()} className="space-y-2">
        <ColorStatusSelect
          value={ticket.status}
          groups={groups}
          onChange={(status) => onStatusChange(ticket.id, status)}
        />

        <button
          onClick={() => setNotesOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          {ticket.notes ? 'Edit note' : 'Add note'}
          {ticket.notes && !notesOpen && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Has a note" />
          )}
        </button>

        {notesOpen && (
          <textarea
            autoFocus
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={saveNotes}
            placeholder="Internal note (not visible to the requester)..."
            rows={3}
            className="w-full text-xs bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
        )}
      </div>
    </motion.div>
  )
}
