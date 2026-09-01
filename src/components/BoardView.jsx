import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PRESET_COLORS, hexToRgba } from '../lib/colors'

export default function BoardView() {
  const [items, setItems] = useState([])
  const [connections, setConnections] = useState([])
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState(null)
  const [showArchive, setShowArchive] = useState(false)

  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })
  const draggingCard = useRef(null)
  const resizingCard = useRef(null)
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

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
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
        setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // A drag/pan/resize can end with the mouse released outside the tracked
  // container (or over a child that doesn't bubble the event the same way),
  // which left dragging "stuck" and caused a flicker on the next interaction.
  // Listening on window guarantees mouseup is always caught.
  useEffect(() => {
    const onWindowMouseMove = (e) => handleCanvasMouseMove(e)
    const onWindowMouseUp = () => handleCanvasMouseUp()
    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, isPanning, items])

  const fetchItems = async () => {
    const { data, error } = await supabase.from('board_items').select('*')
    if (error) {
      console.error('Failed to load board items:', error)
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
      lists: [{ id: crypto.randomUUID(), title: '', fields: [] }],
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      x: worldX,
      y: worldY,
      width: 260,
      height: 200,
    }
    const { data, error } = await supabase.from('board_items').insert(newCard).select()
    if (error) {
      console.error('Failed to create card:', error)
      return
    }
    if (data) setItems((prev) => [...prev, ...data])
  }

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
          prev.map((it) => (it.id === id ? { ...it, x: startPos.x + dx, y: startPos.y + dy } : it))
        )
      }
      if (resizingCard.current) {
        const { id, startMouse, startSize } = resizingCard.current
        const dx = (e.clientX - startMouse.x) / zoom
        const dy = (e.clientY - startMouse.y) / zoom
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  width: Math.max(200, startSize.width + dx),
                  height: Math.max(140, startSize.height + dy),
                }
              : it
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
    if (resizingCard.current) {
      const { id } = resizingCard.current
      const item = items.find((it) => it.id === id)
      if (item) {
        await supabase.from('board_items').update({ width: item.width, height: item.height }).eq('id', id)
      }
      resizingCard.current = null
    }
  }

  const startCardResize = (e, card) => {
    e.stopPropagation()
    resizingCard.current = {
      id: card.id,
      startMouse: { x: e.clientX, y: e.clientY },
      startSize: { width: card.width, height: card.height || 200 },
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
    const { error } = await supabase.from('board_items').update(patch).eq('id', id)
    if (error) console.error('Failed to save card update:', error)
  }

  const deleteCard = async (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
    setConnections((prev) => prev.filter((c) => c.from_id !== id && c.to_id !== id))
    await supabase.from('board_items').delete().eq('id', id)
  }

  const archiveCard = async (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, archived: true } : it)))
    await supabase.from('board_items').update({ archived: true }).eq('id', id)
  }

  const restoreCard = async (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, archived: false } : it)))
    await supabase.from('board_items').update({ archived: false }).eq('id', id)
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

  const visibleItems = items.filter((it) => !it.archived)
  const archivedItems = items.filter((it) => it.archived)

  const viewportW = containerRef.current?.clientWidth || 0
  const viewportH = containerRef.current?.clientHeight || 0
  const viewWorldTL = { x: -pan.x / zoom, y: -pan.y / zoom }
  const viewWorldBR = { x: (viewportW - pan.x) / zoom, y: (viewportH - pan.y) / zoom }

  // Bounds cover every card AND the current viewport, so the minimap always
  // represents the whole canvas rather than clipping to just the cards (which
  // could leave the "you are here" box drifting off the map when panning into
  // empty space).
  const bounds = visibleItems.reduce(
    (acc, it) => ({
      minX: Math.min(acc.minX, it.x),
      minY: Math.min(acc.minY, it.y),
      maxX: Math.max(acc.maxX, it.x + it.width),
      maxY: Math.max(acc.maxY, it.y + (it.height || 200)),
    }),
    {
      minX: Math.min(0, viewWorldTL.x),
      minY: Math.min(0, viewWorldTL.y),
      maxX: Math.max(400, viewWorldBR.x),
      maxY: Math.max(400, viewWorldBR.y),
    }
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
        <button
          onClick={() => setShowArchive(true)}
          className="bg-white shadow-sm border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"
        >
          Archived {archivedItems.length > 0 && `(${archivedItems.length})`}
        </button>
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
          <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ left: 0, top: 0, width: 1, height: 1 }}
          >
            {connections.map((conn) => {
              const from = visibleItems.find((it) => it.id === conn.from_id)
              const to = visibleItems.find((it) => it.id === conn.to_id)
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

          {visibleItems.map((card) => (
            <BoardCard
              key={card.id}
              card={card}
              connectMode={connectMode}
              isConnectSource={connectFrom === card.id}
              onDragStart={(e) => startCardDrag(e, card)}
              onResizeStart={(e) => startCardResize(e, card)}
              onUpdate={(patch) => updateCard(card.id, patch)}
              onDelete={() => deleteCard(card.id)}
              onArchive={() => archiveCard(card.id)}
              onCardClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      </div>

      {visibleItems.length > 0 && (
        <Minimap
          items={visibleItems}
          bounds={bounds}
          pan={pan}
          zoom={zoom}
          setPan={setPan}
          viewportSize={{
            width: containerRef.current?.clientWidth || 0,
            height: containerRef.current?.clientHeight || 0,
          }}
        />
      )}

      {showArchive && (
        <ArchivePanel
          items={archivedItems}
          onClose={() => setShowArchive(false)}
          onRestore={restoreCard}
          onDeletePermanently={deleteCard}
        />
      )}
    </div>
  )
}

function ArchivePanel({ items, onClose, onRestore, onDeletePermanently }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Archived</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No archived cards yet.</p>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: it.color }}
                  />
                  <span className="text-sm text-slate-700 truncate">{it.title}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => onRestore(it.id)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Permanently delete this card? This can\'t be undone.')) {
                        onDeletePermanently(it.id)
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Minimap({ items, bounds, pan, zoom, setPan, viewportSize }) {
  const MAP_W = 200
  const MAP_H = 140
  const padding = 80
  const mapRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const worldW = Math.max(bounds.maxX - bounds.minX + padding * 2, 1)
  const worldH = Math.max(bounds.maxY - bounds.minY + padding * 2, 1)
  const scale = Math.min(MAP_W / worldW, MAP_H / worldH)

  const toMap = (x, y) => ({
    x: (x - bounds.minX + padding) * scale,
    y: (y - bounds.minY + padding) * scale,
  })

  // Map-space point -> world-space point (inverse of toMap)
  const toWorld = (mapX, mapY) => ({
    x: mapX / scale + bounds.minX - padding,
    y: mapY / scale + bounds.minY - padding,
  })

  const viewTopLeft = { x: -pan.x / zoom, y: -pan.y / zoom }
  const viewBottomRight = {
    x: (viewportSize.width - pan.x) / zoom,
    y: (viewportSize.height - pan.y) / zoom,
  }
  const vTL = toMap(viewTopLeft.x, viewTopLeft.y)
  const vBR = toMap(viewBottomRight.x, viewBottomRight.y)

  // Clicking or dragging within the minimap re-centers the main canvas on
  // that point, so the map is actually useful for finding cards elsewhere
  // on an otherwise-infinite canvas.
  const jumpTo = (e) => {
    if (!mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const mapX = e.clientX - rect.left
    const mapY = e.clientY - rect.top
    const world = toWorld(mapX, mapY)
    setPan({
      x: viewportSize.width / 2 - world.x * zoom,
      y: viewportSize.height / 2 - world.y * zoom,
    })
  }

  return (
    <div
      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-md p-1.5"
      style={{ width: MAP_W, height: MAP_H }}
    >
      <div
        ref={mapRef}
        onMouseDown={(e) => {
          setDragging(true)
          jumpTo(e)
        }}
        onMouseMove={(e) => dragging && jumpTo(e)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        className="relative w-full h-full overflow-hidden rounded cursor-pointer"
        title="Click or drag to jump around the board"
      >
        {items.map((it) => {
          const p = toMap(it.x, it.y)
          return (
            <div
              key={it.id}
              className="absolute rounded-sm pointer-events-none"
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
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
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

function BoardCard({ card, onDragStart, onResizeStart, onUpdate, onDelete, onArchive, connectMode, isConnectSource, onCardClick }) {
  const [title, setTitle] = useState(card.title)
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Normalize older cards (checkbox-item model) into the new free-text-field
  // model so nothing already saved gets lost.
  const lists =
    card.lists && card.lists.length > 0
      ? card.lists.map((l) => ({
          ...l,
          fields:
            l.fields ||
            (l.items || []).map((it) => ({
              id: it.id,
              html: escapeHtml(it.text || ''),
              files: [],
            })),
        }))
      : [{ id: 'default', title: '', fields: [] }]

  const updateLists = (nextLists) => onUpdate({ lists: nextLists })

  const addList = () => {
    updateLists([...lists, { id: crypto.randomUUID(), title: '', fields: [] }])
  }

  const renameList = (listId, title) => {
    updateLists(lists.map((l) => (l.id === listId ? { ...l, title } : l)))
  }

  const deleteList = (listId) => {
    updateLists(lists.filter((l) => l.id !== listId))
  }

  const addField = (listId) => {
    updateLists(
      lists.map((l) =>
        l.id === listId
          ? { ...l, fields: [...(l.fields || []), { id: crypto.randomUUID(), html: '', files: [] }] }
          : l
      )
    )
  }

  const updateField = (listId, fieldId, html) => {
    updateLists(
      lists.map((l) =>
        l.id === listId
          ? { ...l, fields: l.fields.map((f) => (f.id === fieldId ? { ...f, html } : f)) }
          : l
      )
    )
  }

  const deleteField = (listId, fieldId) => {
    updateLists(
      lists.map((l) =>
        l.id === listId ? { ...l, fields: l.fields.filter((f) => f.id !== fieldId) } : l
      )
    )
  }

  const addFieldFile = (listId, fieldId, file) => {
    updateLists(
      lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              fields: l.fields.map((f) =>
                f.id === fieldId ? { ...f, files: [...(f.files || []), file] } : f
              ),
            }
          : l
      )
    )
  }

  const removeFieldFile = (listId, fieldId, fileId) => {
    updateLists(
      lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              fields: l.fields.map((f) =>
                f.id === fieldId ? { ...f, files: (f.files || []).filter((x) => x.id !== fileId) } : f
              ),
            }
          : l
      )
    )
  }

  return (
    <div
      onMouseDown={(e) => {
        if (!connectMode && e.button === 0) onDragStart(e)
      }}
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
        border: isConnectSource ? '2px solid #3b82f6' : `1px solid ${hexToRgba(card.color, 1)}`,
        cursor: connectMode ? 'crosshair' : 'grab',
      }}
    >
      {/* Opaque white backing so connector lines and the canvas dot-grid never
          show through the card, while the color layer on top keeps the
          translucent pastel look */}
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(card.color, 0.85) }} />

      <div className="relative flex flex-col flex-1">
      <div
        className="px-3 py-2 flex items-center justify-between relative"
        style={{ backgroundColor: hexToRgba(card.color, 1), cursor: connectMode ? 'crosshair' : 'inherit' }}
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
          onClick={onArchive}
          className="text-slate-500 hover:text-slate-800 ml-2 flex-shrink-0"
          title="Archive card"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M10 12h4"
            />
          </svg>
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="text-slate-500 hover:text-red-500 ml-1 flex-shrink-0"
          title="Delete card permanently"
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
            onAddField={() => addField(list.id)}
            onUpdateField={(fieldId, html) => updateField(list.id, fieldId, html)}
            onDeleteField={(fieldId) => deleteField(list.id, fieldId)}
            onAddFieldFile={(fieldId, file) => addFieldFile(list.id, fieldId, file)}
            onRemoveFieldFile={(fieldId, fileId) => removeFieldFile(list.id, fieldId, fileId)}
            showDeleteList={lists.length > 1}
            cardId={card.id}
          />
        ))}

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={addList}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          + Add list
        </button>
      </div>
      </div>

      <div
        onMouseDown={(e) => {
          e.stopPropagation()
          onResizeStart(e)
        }}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        title="Drag to resize"
      >
        <svg viewBox="0 0 16 16" className="w-full h-full text-black/25">
          <path d="M14 2 2 14M14 8 8 14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  )
}

function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Finds the text of the current line up to the caret, so we can detect
// "- " or "1. " at the start of a line and auto-continue it on Enter — like
// native Notes/Word list auto-formatting.
function getCurrentLineTextBeforeCaret(fieldEl) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return ''
  const node = sel.anchorNode
  const offset = sel.anchorOffset
  if (!node || node.nodeType !== Node.TEXT_NODE) return ''

  let text = node.textContent.slice(0, offset)
  let prev = node.previousSibling
  while (prev && prev.nodeName !== 'BR') {
    text = (prev.textContent || '') + text
    prev = prev.previousSibling
  }
  return text
}

function ListBlock({
  list,
  onRename,
  onDeleteList,
  onAddField,
  onUpdateField,
  onDeleteField,
  onAddFieldFile,
  onRemoveFieldFile,
  showDeleteList,
  cardId,
}) {
  const [titleDraft, setTitleDraft] = useState(list.title)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => onRename(titleDraft)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Untitled list"
          className="bg-transparent text-xs font-semibold text-slate-700 outline-none w-full placeholder:text-slate-500/50"
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

      <div className="space-y-1.5">
        {(list.fields || []).map((field) => (
          <RichTextField
            key={field.id}
            field={field}
            cardId={cardId}
            listId={list.id}
            onSave={(html) => onUpdateField(field.id, html)}
            onDelete={() => onDeleteField(field.id)}
            onAddFile={(file) => onAddFieldFile(field.id, file)}
            onRemoveFile={(fileId) => onRemoveFieldFile(field.id, fileId)}
          />
        ))}

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onAddField}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          + Add text field
        </button>
      </div>
    </div>
  )
}

function RichTextField({ field, cardId, listId, onSave, onDelete, onAddFile, onRemoveFile }) {
  const ref = useRef(null)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // Uncontrolled contentEditable: only push `html` into the DOM when it
  // actually differs from what's there, so we don't clobber the cursor
  // position while the person is actively typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (field.html || '')) {
      ref.current.innerHTML = field.html || ''
    }
  }, [field.html])

  const handleFocus = () => {
    // Makes Enter insert a plain <br> line break instead of a new <div>
    // "paragraph", which otherwise looks double-spaced — closer to a notepad.
    document.execCommand('defaultParagraphSeparator', false, 'br')
  }

  const handleBlur = () => {
    if (ref.current) onSave(ref.current.innerHTML)
  }

  const handleKeyDown = (e) => {
    // Cmd/Ctrl+Shift+X toggles strikethrough — Bold (Cmd/Ctrl+B) and Italic
    // (Cmd/Ctrl+I) already work natively inside contentEditable in every
    // major browser, so no extra handling is needed for those.
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
      e.preventDefault()
      document.execCommand('strikeThrough')
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const lineText = getCurrentLineTextBeforeCaret(ref.current)
      const numberMatch = lineText.match(/^(\d+)\.\s/)
      if (/^-\s/.test(lineText)) {
        e.preventDefault()
        document.execCommand('insertHTML', false, '<br>- ')
      } else if (numberMatch) {
        e.preventDefault()
        const next = parseInt(numberMatch[1], 10) + 1
        document.execCommand('insertHTML', false, `<br>${next}. `)
      }
      // Otherwise let the browser's default Enter (now a plain line break)
      // happen on its own.
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${cardId}/${listId}/${field.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('board-files').upload(path, file)
    if (error) {
      console.error('File upload failed:', error)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('board-files').getPublicUrl(path)
    onAddFile({ id: crypto.randomUUID(), name: file.name, url: urlData.publicUrl })
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div className="bg-white/40 rounded-lg p-2 group/field">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
        data-placeholder="Type here… try '- ' or '1. ' for a list, ⌘B/⌘I to format"
        className="text-sm text-slate-700 outline-none min-h-[1.4em] whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500/50"
      />

      {(field.files || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {field.files.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-white/60 rounded-full px-2 py-0.5 text-[11px] text-slate-600 hover:bg-white group"
            >
              📎 {f.name}
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault()
                  onRemoveFile(f.id)
                }}
                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-500 hover:text-slate-800"
          title="Attach a file or link"
        >
          {uploading ? (
            <span className="text-[10px]">…</span>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          )}
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="text-slate-400 hover:text-red-500 text-xs"
          title="Delete this text field"
        >
          ✕
        </button>
      </div>
    </div>
  )
}