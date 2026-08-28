import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PRESET_COLORS, hexToRgba } from '../lib/colors'

const URL_REGEX = /^(https?:\/\/[^\s]+)$/i

export default function BoardView() {
  const [items, setItems] = useState([])
  const [connections, setConnections] = useState([])
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState(null)

  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })
  const draggingCard = useRef(null) // { id, startMouse:{x,y}, startPos:{x,y} }
  const containerRef = useRef(null)

  useEffect(() => {
    fetchItems()
    fetchConnections()

    const sub = supabase
      .channel('board-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_items' }, fetchItems)
      .subscribe()

    const connSub = supabase
      .channel('board-connections-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_connections' },
        fetchConnections
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
      supabase.removeChannel(connSub)
    }
  }, [])

  // Native wheel listener so preventDefault reliably blocks page/trackpad scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        // Pinch-zoom (trackpad) or ctrl+wheel: zoom, centered on cursor
        const rect = el.getBoundingClientRect()
        const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        setZoom((prevZoom) => {
          const newZoom = Math.min(2.5, Math.max(0.25, prevZoom * (1 - e.deltaY * 0.01)))
          setPan((prevPan) => ({
            x: cursor.x - (newZoom / prevZoom) * (cursor.x - prevPan.x),
            y: cursor.y - (newZoom / prevZoom) * (cursor.y - prevPan.y),
          }))
          return newZoom
        })
      } else {
        // Two-finger trackpad scroll (or mouse wheel): pan in any direction
        setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const fetchItems = async () => {
    const { data, error } = await supabase.from('board_items').select('*')
    if (error) {
      console.error(error)
      return
    }
    setItems(data || [])
  }

  const fetchConnections = async () => {
    const { data, error } = await supabase.from('board_connections').select('*')
    if (error) {
      console.error(error)
      return
    }
    setConnections(data || [])
  }

  const addCard = async () => {
    const rect = containerRef.current?.getBoundingClientRect()
    const worldX = rect ? (rect.width / 2 - pan.x) / zoom - 130 : 100
    const worldY = rect ? (rect.height / 2 - pan.y) / zoom - 100 : 100

    const newCard = {
      title: 'New Note',
      lists: [{ id: crypto.randomUUID(), title: 'Checklist', items: [] }],
      images: [],
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      x: worldX,
      y: worldY,
      width: 260,
      height: 200,
    }
    const { data, error } = await supabase.from('board_items').insert(newCard).select()
    if (error) console.error(error)
    if (data) setItems((prev) => [...prev, ...data])
  }

  // --- Canvas panning (only when clicking empty background, not a card) ---
  const handleCanvasMouseDown = (e) => {
    if (e.target !== containerRef.current && e.target.dataset?.canvasBg !== 'true') return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY }
    panOrigin.current = { ...pan }
  }

  const handleCanvasMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        setPan({
          x: panOrigin.current.x + (e.clientX - panStart.current.x),
          y: panOrigin.current.y + (e.clientY - panStart.current.y),
        })
      }
      if (draggingCard.current) {
        const { id, startMouse, startPos } = draggingCard.current
        const dx = (e.clientX - startMouse.x) / zoom
        const dy = (e.clientY - startMouse.y) / zoom
        setItems((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, x: startPos.x + dx, y: startPos.y + dy } : it
          )
        )
      }
    },
    [isPanning, zoom]
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
    draggingCard.current = {
      id: card.id,
      startMouse: { x: e.clientX, y: e.clientY },
      startPos: { x: card.x, y: card.y },
    }
  }

  const updateCard = async (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
    await supabase.from('board_items').update(patch).eq('id', id)
  }

  const deleteCard = async (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
    setConnections((prev) => prev.filter((c) => c.from_id !== id && c.to_id !== id))
    await supabase.from('board_items').delete().eq('id', id)
  }

  const handleCardClick = async (card) => {
    if (!connectMode) return
    if (!connectFrom) {
      setConnectFrom(card.id)
      return
    }
    if (connectFrom === card.id) {
      setConnectFrom(null)
      return
    }
    const { data, error } = await supabase
      .from('board_connections')
      .insert({ from_id: connectFrom, to_id: card.id })
      .select()
    if (error) console.error(error)
    if (data) setConnections((prev) => [...prev, ...data])
    setConnectFrom(null)
  }

  const deleteConnection = async (id) => {
    setConnections((prev) => prev.filter((c) => c.id !== id))
    await supabase.from('board_connections').delete().eq('id', id)
  }

  const cardCenter = (card) => ({ x: card.x + card.width / 2, y: card.y + (card.height || 200) / 2 })

  // --- Minimap bounds ---
  const bounds = items.reduce(
    (acc, it) => ({
      minX: Math.min(acc.minX, it.x),
      minY: Math.min(acc.minY, it.y),
      maxX: Math.max(acc.maxX, it.x + it.width),
      maxY: Math.max(acc.maxY, it.y + (it.height || 200)),
    }),
    { minX: 0, minY: 0, maxX: 400, maxY: 400 }
  )

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
          onClick={() => {
            setConnectMode((c) => !c)
            setConnectFrom(null)
          }}
          className={`shadow-sm border rounded-lg px-3 py-1.5 text-sm font-medium ${
            connectMode
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {connectMode ? (connectFrom ? 'Click another card…' : 'Click first card…') : '🔗 Connect Cards'}
        </button>
        <div className="bg-white shadow-sm border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-400 flex items-center gap-1.5">
          Zoom {Math.round(zoom * 100)}%
        </div>
      </div>

      <div
        ref={containerRef}
        data-canvas-bg="true"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        className="w-full h-full relative"
        style={{
          cursor: isPanning ? 'grabbing' : 'default',
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* World layer: everything here uses raw world coordinates */}
        <div
          data-canvas-bg="true"
          className="absolute top-0 left-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: 1,
            height: 1,
          }}
        >
          {/* Connector lines */}
          <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ left: 0, top: 0, width: 1, height: 1 }}
          >
            {connections.map((conn) => {
              const from = items.find((it) => it.id === conn.from_id)
              const to = items.find((it) => it.id === conn.to_id)
              if (!from || !to) return null
              const a = cardCenter(from)
              const b = cardCenter(to)
              return (
                <line
                  key={conn.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#94A3B8"
                  strokeWidth={2 / zoom}
                  className="pointer-events-auto cursor-pointer hover:stroke-red-400"
                  onClick={() => deleteConnection(conn.id)}
                />
              )
            })}
          </svg>

          {items.map((card) => (
            <BoardCard
              key={card.id}
              card={card}
              connectMode={connectMode}
              isConnectSource={connectFrom === card.id}
              onDragStart={(e) => startCardDrag(e, card)}
              onUpdate={(patch) => updateCard(card.id, patch)}
              onDelete={() => deleteCard(card.id)}
              onCardClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      </div>

      {isPanning && items.length > 0 && (
        <Minimap
          items={items}
          bounds={bounds}
          pan={pan}
          zoom={zoom}
          viewportSize={{
            width: containerRef.current?.clientWidth || 0,
            height: containerRef.current?.clientHeight || 0,
          }}
        />
      )}
    </div>
  )
}

function Minimap({ items, bounds, pan, zoom, viewportSize }) {
  const MAP_W = 160
  const MAP_H = 110
  const padding = 40
  const worldW = Math.max(bounds.maxX - bounds.minX + padding * 2, 1)
  const worldH = Math.max(bounds.maxY - bounds.minY + padding * 2, 1)
  const scale = Math.min(MAP_W / worldW, MAP_H / worldH)

  const toMap = (x, y) => ({
    x: (x - bounds.minX + padding) * scale,
    y: (y - bounds.minY + padding) * scale,
  })

  // Visible viewport in world coordinates
  const viewTopLeft = { x: -pan.x / zoom, y: -pan.y / zoom }
  const viewBottomRight = {
    x: (viewportSize.width - pan.x) / zoom,
    y: (viewportSize.height - pan.y) / zoom,
  }
  const vTL = toMap(viewTopLeft.x, viewTopLeft.y)
  const vBR = toMap(viewBottomRight.x, viewBottomRight.y)

  return (
    <div
      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-md p-1.5"
      style={{ width: MAP_W, height: MAP_H }}
    >
      <div className="relative w-full h-full overflow-hidden rounded">
        {items.map((it) => {
          const p = toMap(it.x, it.y)
          return (
            <div
              key={it.id}
              className="absolute rounded-sm"
              style={{
                left: p.x,
                top: p.y,
                width: Math.max(4, it.width * scale),
                height: Math.max(4, (it.height || 200) * scale),
                backgroundColor: it.color,
              }}
            />
          )
        })}
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: vTL.x,
            top: vTL.y,
            width: Math.max(2, vBR.x - vTL.x),
            height: Math.max(2, vBR.y - vTL.y),
          }}
        />
      </div>
    </div>
  )
}

function BoardCard({ card, onDragStart, onUpdate, onDelete, connectMode, isConnectSource, onCardClick }) {
  const [title, setTitle] = useState(card.title)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [addingImage, setAddingImage] = useState(false)

  const lists = card.lists && card.lists.length > 0 ? card.lists : [{ id: 'default', title: 'Checklist', items: [] }]

  const updateLists = (nextLists) => onUpdate({ lists: nextLists })

  const addList = () => {
    updateLists([...lists, { id: crypto.randomUUID(), title: 'New List', items: [] }])
  }

  const renameList = (listId, title) => {
    updateLists(lists.map((l) => (l.id === listId ? { ...l, title } : l)))
  }

  const deleteList = (listId) => {
    updateLists(lists.filter((l) => l.id !== listId))
  }

  const addListItem = (listId, text) => {
    if (!text.trim()) return
    updateLists(
      lists.map((l) =>
        l.id === listId
          ? { ...l, items: [...l.items, { id: crypto.randomUUID(), text, done: false }] }
          : l
      )
    )
  }

  const toggleItem = (listId, itemId) => {
    updateLists(
      lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items
                .map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))
                // crossed-out items sink to the bottom
                .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)),
            }
          : l
      )
    )
  }

  const removeItem = (listId, itemId) => {
    updateLists(
      lists.map((l) => (l.id === listId ? { ...l, items: l.items.filter((it) => it.id !== itemId) } : l))
    )
  }

  const images = card.images || []
  const addImage = () => {
    if (!newImageUrl.trim()) return
    onUpdate({ images: [...images, newImageUrl.trim()] })
    setNewImageUrl('')
    setAddingImage(false)
  }
  const removeImage = (url) => onUpdate({ images: images.filter((i) => i !== url) })

  return (
    <div
      onClick={(e) => {
        if (connectMode) {
          e.stopPropagation()
          onCardClick()
        }
      }}
      className="absolute rounded-xl shadow-md flex flex-col overflow-hidden select-none"
      style={{
        left: card.x,
        top: card.y,
        width: card.width,
        minHeight: card.height,
        backgroundColor: hexToRgba(card.color, 0.85),
        border: isConnectSource ? '2px solid #3b82f6' : `1px solid ${hexToRgba(card.color, 1)}`,
        cursor: connectMode ? 'crosshair' : 'default',
      }}
    >
      <div
        onMouseDown={(e) => {
          if (!connectMode) onDragStart(e)
        }}
        className="px-3 py-2 flex items-center justify-between relative"
        style={{
          backgroundColor: hexToRgba(card.color, 1),
          cursor: connectMode ? 'crosshair' : 'grab',
        }}
      >
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            setShowColorPicker((s) => !s)
          }}
          className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0 mr-2"
          style={{ backgroundColor: card.color }}
          title="Change color"
        />
        {showColorPicker && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-8 left-2 z-10 bg-white shadow-lg border border-slate-200 rounded-lg p-2 grid grid-cols-4 gap-1.5"
          >
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onUpdate({ color: c })
                  setShowColorPicker(false)
                }}
                className="w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
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
          title="Delete card"
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {lists.map((list) => (
          <ListBlock
            key={list.id}
            list={list}
            onRename={(title) => renameList(list.id, title)}
            onDeleteList={() => deleteList(list.id)}
            onAddItem={(text) => addListItem(list.id, text)}
            onToggleItem={(itemId) => toggleItem(list.id, itemId)}
            onRemoveItem={(itemId) => removeItem(list.id, itemId)}
            showDeleteList={lists.length > 1}
          />
        ))}

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={addList}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          + Add list
        </button>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {images.map((url) => (
              <div key={url} className="relative group">
                <img src={url} alt="" className="w-full h-16 object-cover rounded" />
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => removeImage(url)}
                  className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full w-4 h-4 text-[10px] opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {addingImage ? (
          <div className="flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addImage()}
              placeholder="Paste image URL"
              className="flex-1 bg-white/60 rounded px-2 py-1 text-xs outline-none"
              autoFocus
            />
            <button onClick={addImage} className="text-xs bg-slate-800 text-white rounded px-2">
              Add
            </button>
          </div>
        ) : (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setAddingImage(true)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            + Add image (URL)
          </button>
        )}
      </div>
    </div>
  )
}

function ListBlock({ list, onRename, onDeleteList, onAddItem, onToggleItem, onRemoveItem, showDeleteList }) {
  const [titleDraft, setTitleDraft] = useState(list.title)
  const [newItemText, setNewItemText] = useState('')

  const submitItem = () => {
    if (!newItemText.trim()) return
    onAddItem(newItemText)
    setNewItemText('')
  }

  return (
    <div className="bg-white/40 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => onRename(titleDraft)}
          onMouseDown={(e) => e.stopPropagation()}
          className="bg-transparent text-xs font-semibold text-slate-700 outline-none w-full"
        />
        {showDeleteList && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onDeleteList}
            className="text-slate-400 hover:text-red-500 text-xs flex-shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-1">
        {list.items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={it.done}
              onChange={() => onToggleItem(it.id)}
              onMouseDown={(e) => e.stopPropagation()}
            />
            {URL_REGEX.test(it.text) ? (
              <a
                href={it.text}
                target="_blank"
                rel="noopener noreferrer"
                onMouseDown={(e) => e.stopPropagation()}
                className={`text-sm flex-1 underline ${
                  it.done ? 'line-through text-slate-400' : 'text-blue-600'
                }`}
              >
                {it.text}
              </a>
            ) : (
              <span
                className={`text-sm flex-1 ${it.done ? 'line-through text-slate-500' : 'text-slate-700'}`}
              >
                {it.text}
              </span>
            )}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onRemoveItem(it.id)}
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
            onKeyDown={(e) => e.key === 'Enter' && submitItem()}
            placeholder="+ add item or paste a link"
            className="flex-1 bg-white/50 rounded px-2 py-1 text-xs outline-none"
          />
        </div>
      </div>
    </div>
  )
}
