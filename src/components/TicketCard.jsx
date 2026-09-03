import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ColorStatusSelect from './ColorStatusSelect'

const DEFAULT_FIELDS = { name: true, email: true, problem: true, date: true, notes: true, status: true }

function toDateInputValue(isoString) {
  const d = new Date(isoString)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function TicketCard({
  ticket,
  groups,
  onStatusChange,
  onNotesChange,
  onFieldsChange,
  onDelete,
  selected,
  onSelect,
  draggable = true,
  onDragStart,
  visibleFields = DEFAULT_FIELDS,
}) {
  const categoryColor = ticket.category === 'Parish' ? '#C7A9DC' : '#8FB4DB'
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState(ticket.notes || '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(ticket.name || '')
  const [problemDraft, setProblemDraft] = useState(ticket.problem || '')
  const [dateDraft, setDateDraft] = useState(toDateInputValue(ticket.created_at))
  const cardRef = useRef(null)

  const saveNotes = () => {
    if (notesDraft !== (ticket.notes || '')) {
      onNotesChange(ticket.id, notesDraft)
    }
  }

  // Clicking anywhere outside the card collapses an open note back to its
  // grey preview (and saves it first).
  useEffect(() => {
    if (!notesOpen) return
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        saveNotes()
        setNotesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesOpen, notesDraft])

  const saveEdit = () => {
    // Keep local noon to avoid timezone rollover shifting the date by a day
    const newDate = new Date(`${dateDraft}T12:00:00`)
    onFieldsChange(ticket.id, {
      name: nameDraft,
      problem: problemDraft,
      created_at: newDate.toISOString(),
    })
    setEditing(false)
  }

  const cancelEdit = () => {
    setNameDraft(ticket.name || '')
    setProblemDraft(ticket.problem || '')
    setDateDraft(toDateInputValue(ticket.created_at))
    setEditing(false)
  }

  // Whichever field is first in this priority list (and actually visible/has
  // content) gets bold "title" styling; the rest render as normal body text.
  const priority = ['name', 'problem', 'email']
  const firstVisibleKey = priority.find((k) => {
    if (!visibleFields[k]) return false
    if (k === 'name') return true // always show "Anonymous request" fallback
    return !!ticket[k]
  })

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      draggable={draggable && !editing}
      onDragStart={onDragStart}
      onClick={(e) => !editing && onSelect && onSelect(ticket.id, e)}
      className={`relative bg-white rounded-lg shadow-sm p-3 select-none transition-colors ${
        editing ? 'cursor-default' : 'cursor-pointer'
      } ${draggable ? 'active:cursor-grabbing' : ''} ${
        selected
          ? 'border-2 border-blue-400 ring-2 ring-blue-100'
          : 'border border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top row: title (whichever field is first, per Settings) on the left, compact category + status on the right */}
      <div className="flex items-start justify-between gap-2 mb-1">
        {!editing && firstVisibleKey && (
          <p className="font-semibold text-slate-800 text-sm break-words min-w-0">
            {firstVisibleKey === 'name' && (ticket.name || 'Anonymous request')}
            {firstVisibleKey === 'problem' && ticket.problem}
            {firstVisibleKey === 'email' && ticket.email}
          </p>
        )}
        {editing && <span />}

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
          <select
            value={ticket.category || 'School'}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              onFieldsChange(ticket.id, { category: e.target.value })
            }}
            className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300"
            style={{ backgroundColor: `${categoryColor}22`, color: categoryColor }}
          >
            <option value="School">School</option>
            <option value="Parish">Parish</option>
          </select>
          {visibleFields.status && (
            <div onClick={(e) => e.stopPropagation()}>
              <ColorStatusSelect
                value={ticket.status}
                groups={groups}
                onChange={(status) => onStatusChange(ticket.id, status)}
                compact
              />
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div onClick={(e) => e.stopPropagation()} className="space-y-2 mb-2">
          {visibleFields.name && (
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Name"
              className="w-full text-sm border border-slate-200 rounded-md px-2 py-1"
            />
          )}
          <textarea
            value={problemDraft}
            onChange={(e) => setProblemDraft(e.target.value)}
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-md px-2 py-1 resize-none"
          />
          {visibleFields.date && (
            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-2 py-1"
            />
          )}
          <div className="flex justify-end gap-2">
            <button onClick={cancelEdit} className="text-xs text-slate-500 px-2 py-1">
              Cancel
            </button>
            <button onClick={saveEdit} className="text-xs bg-slate-800 text-white rounded px-3 py-1.5">
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {firstVisibleKey !== 'name' && visibleFields.name && (
            <p className="text-sm text-slate-700 mb-1">{ticket.name || 'Anonymous request'}</p>
          )}
          {visibleFields.email && ticket.email && firstVisibleKey !== 'email' && (
            <p className="text-xs text-slate-400 mb-2">{ticket.email}</p>
          )}
          {visibleFields.problem && firstVisibleKey !== 'problem' && (
            <p className="text-sm text-slate-600 line-clamp-3 mb-2">{ticket.problem}</p>
          )}
        </>
      )}

      {visibleFields.date && (
        <div className="text-xs text-slate-400 mb-2">
          <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
        </div>
      )}

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

      {visibleFields.notes && (
        <div onClick={(e) => e.stopPropagation()} className="mb-2">
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
          </button>

          {notesOpen ? (
            <div className="mt-1.5">
              <textarea
                autoFocus
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Internal note (not visible to the requester)..."
                rows={3}
                className="w-full text-xs bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
              <div className="flex justify-end mt-1">
                <button
                  onClick={() => {
                    saveNotes()
                    setNotesOpen(false)
                  }}
                  className="text-xs bg-slate-800 text-white rounded px-3 py-1"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            ticket.notes && (
              <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">{ticket.notes}</p>
            )
          )}
        </div>
      )}

      {/* Bottom row: edit + delete, bottom-right */}
      {!editing && (
        <div className="flex justify-end gap-1.5 -mb-1 -mr-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            className="text-slate-300 hover:text-slate-600 p-1"
            title="Edit request"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setConfirmingDelete(true)
            }}
            className="text-slate-300 hover:text-red-500 p-1"
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
      )}
    </motion.div>
  )
}