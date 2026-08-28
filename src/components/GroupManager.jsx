import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { PRESET_COLORS } from '../lib/colors'

export default function GroupManager({ groups, onClose, onGroupsChange }) {
  const [localGroups, setLocalGroups] = useState(groups)
  const [newGroupName, setNewGroupName] = useState('')
  const [openColorPickerId, setOpenColorPickerId] = useState(null)

  const addGroup = async () => {
    if (!newGroupName.trim()) return
    const nextColor = PRESET_COLORS[localGroups.length % PRESET_COLORS.length]
    await supabase.from('ticket_groups').insert({
      name: newGroupName.trim(),
      sort_order: localGroups.length,
      color: nextColor,
    })
    setNewGroupName('')
    onGroupsChange()
  }

  const renameGroup = async (id, name) => {
    if (!name.trim()) return
    await supabase.from('ticket_groups').update({ name }).eq('id', id)
    onGroupsChange()
  }

  const setColor = async (id, color) => {
    setLocalGroups((prev) => prev.map((g) => (g.id === id ? { ...g, color } : g)))
    await supabase.from('ticket_groups').update({ color }).eq('id', id)
    onGroupsChange()
    setOpenColorPickerId(null)
  }

  const deleteGroup = async (id) => {
    await supabase.from('ticket_groups').delete().eq('id', id)
    onGroupsChange()
  }

  const moveGroup = async (index, direction) => {
    const newOrder = [...localGroups]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]
    setLocalGroups(newOrder)

    await Promise.all(
      newOrder.map((g, i) => supabase.from('ticket_groups').update({ sort_order: i }).eq('id', g.id))
    )
    onGroupsChange()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-slate-800 mb-4">Manage Groups</h3>

        <div className="space-y-2 mb-4">
          {localGroups.map((g, i) => (
            <div key={g.id} className="flex items-center gap-2 relative">
              <button
                onClick={() => setOpenColorPickerId(openColorPickerId === g.id ? null : g.id)}
                className="w-6 h-6 rounded-full flex-shrink-0 border border-black/10"
                style={{ backgroundColor: g.color }}
                title="Change color"
              />
              {openColorPickerId === g.id && (
                <div className="absolute top-8 left-0 z-10 bg-white shadow-lg border border-slate-200 rounded-lg p-2 grid grid-cols-4 gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(g.id, c)}
                      className="w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
              <input
                defaultValue={g.name}
                onBlur={(e) => renameGroup(g.id, e.target.value)}
                className="flex-1 border border-slate-200 rounded-md px-2 py-1 text-sm"
              />
              <button onClick={() => moveGroup(i, -1)} className="text-slate-400 hover:text-slate-700">↑</button>
              <button onClick={() => moveGroup(i, 1)} className="text-slate-400 hover:text-slate-700">↓</button>
              <button onClick={() => deleteGroup(g.id)} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name"
            onKeyDown={(e) => e.key === 'Enter' && addGroup()}
            className="flex-1 border border-slate-200 rounded-md px-2 py-1 text-sm"
          />
          <button onClick={addGroup} className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm">
            Add
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-sm py-2 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          Done
        </button>
      </div>
    </div>
  )
}
