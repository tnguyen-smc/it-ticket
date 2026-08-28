import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PRESET_COLORS, hexToRgba } from '../lib/colors'

export default function BoardView() {
  const [items, setItems] = useState([])
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const draggingCard = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    fetchItems()

    const sub = supabase
      .channel('board-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_items' }, fetchItems)
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [])

  const fetchItems = async () => {
    const { data, error } = await supabase.from('board_items').select('*')
    if (error) {
      console.error(error)
      return
    }
    setItems(data || [])
  }

  const addCard = async () => {
    const rect = containerRef.current?.getBoundingClientRect()
    const centerX = rect ? rect.width / 2 - pan.x - 130 : 100
    const centerY = rect ? rect.height / 2 - pan.y - 100 : 100

    const newCard = {
      title: 'New Note',
      items: [],
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      x: centerX,
      y: centerY,
      width: 260,
      height: 200,
    }
    const { data, error } = await supabase.from('board_items').insert(newCard).select()
    if (error) console.error(error)
    if (data) setItems((prev) => [...prev, ...data])
  }

  // --- Canvas panning ---
  const handleCanvasMouseDown = (e) => {
    if (e.target !== containerRef.current) return
    setIsPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleCanvasMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
      }
      if (draggingCard.current) {
        const { id, offsetX, offsetY } = draggingCard.current
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? { ...it, x: e.clientX - offsetX - pan.x, y: e.clientY - offsetY - pan.y }
              : it
          )
        )
      }
    },
    [isPanning, pan]
  )

  const handleCanvasMouseUp = async () => {
    setIsPanning(false)
    if (draggingCard.current) {
      const { id } = draggingCard.current
      const item = items.find((it) => it.id === id)
      if (item) {
        await supabase.from('board_items').update({ x: item.x, y: item.y }).eq('id', id)
      }
      draggingCard.current = null
    }
  }

  const startCardDrag = (e, card) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    draggingCard.current = {
      id: card.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
  }

  const updateCard = async (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
    await supabase.from('board_items').update(patch).eq('id', id)
  }

  const deleteCard = async (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
    await supabase.from('board_items').delete().eq('id', id)
  }

  return (
    <div className="relative w-full h-[calc(100vh-140px)] overflow-hidden bg-slate-100 rounded-xl border border-slate-200">
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <button
          onClick={addCard}
          className="bg-white shadow-sm border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          + Add Card
        </button>
        <button
          onClick={() => setPan({ x: 0, y: 0 })}
          className="bg-white shadow-sm border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
        >
          Reset View
        </button>
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        className={`w-full h-full relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {items.map((card) => (
          <BoardCard
            key={card.id}
            card={card}
            pan={pan}
            onDragStart={(e) => startCardDrag(e, card)}
            onUpdate={(patch) => updateCard(card.id, patch)}
            onDelete={() => deleteCard(card.id)}
          />
        ))}
      </div>
    </div>
  )
}

function BoardCard({ card, pan, onDragStart, onUpdate, onDelete }) {
  const [title, setTitle] = useState(card.title)
  const [newItemText, setNewItemText] = useState('')

  const addListItem = () => {
    if (!newItemText.trim()) return
    const next = [...(card.items || []), { id: crypto.randomUUID(), text: newItemText, done: false }]
    onUpdate({ items: next })
    setNewItemText('')
  }

  const toggleItem = (id) => {
    const next = (card.items || []).map((it) => (it.id === id ? { ...it, done: !it.done } : it))
    onUpdate({ items: next })
  }

  const removeItem = (id) => {
    const next = (card.items || []).filter((it) => it.id !== id)
    onUpdate({ items: next })
  }

  return (
    <div
      className="absolute rounded-xl shadow-md flex flex-col overflow-hidden select-none"
      style={{
        left: card.x + pan.x,
        top: card.y + pan.y,
        width: card.width,
        minHeight: card.height,
        backgroundColor: hexToRgba(card.color, 0.85),
        border: `1px solid ${hexToRgba(card.color, 1)}`,
      }}
    >
      <div
        onMouseDown={onDragStart}
        className="px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: hexToRgba(card.color, 1) }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onUpdate({ title })}
          onMouseDown={(e) => e.stopPropagation()}
          className="bg-transparent font-semibold text-sm text-slate-800 outline-none w-full"
        />
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="text-slate-500 hover:text-red-500 ml-2 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-1.5 flex-1">
        {(card.items || []).map((it) => (
          <div key={it.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={it.done}
              onChange={() => toggleItem(it.id)}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <span
              className={`text-sm flex-1 ${it.done ? 'line-through text-slate-500' : 'text-slate-700'}`}
            >
              {it.text}
            </span>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => removeItem(it.id)}
              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs"
            >
              ✕
            </button>
          </div>
        ))}

        <div className="flex items-center gap-1 pt-1" onMouseDown={(e) => e.stopPropagation()}>
          <input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addListItem()}
            placeholder="+ add item"
            className="flex-1 bg-white/50 rounded px-2 py-1 text-xs outline-none"
          />
        </div>
      </div>
    </div>
  )
}
