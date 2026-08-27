import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function GroupManager({ groups, onClose, onGroupsChange }) {
  const [localGroups, setLocalGroups] = useState(groups)
  const [newGroupName, setNewGroupName] = useState('')

  const addGroup = async () => {
    if (!newGroupName.trim()) return
    const { error } = await supabase.from('ticket_groups').insert({
      name: newGroupName.trim(),
      sort_order: localGroups.length,
    })
    if (error) console.error(error)
    setNewGroupName('')
    onGroupsChange()
  }

  const renameGroup = async (id, name) => {
    if (!name.trim()) return
    const { error } = await supabase.from('ticket_groups').update({ name }).eq('id', id)
    if (error) console.error(error)
    onGroupsChange()
  }

  const deleteGroup = async (id) => {
    const { error } = await supabase.from('ticket_groups').delete().eq('id', id)
    if (error) console.error(error)
    onGroupsChange()
  }

  const moveGroup = async (index, direction) => {
    const newOrder = [...localGroups]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]
    setLocalGroups(newOrder)

    await Promise.all(
      newOrder.map((g, i) =>
        supabase.from('ticket_groups').update({ sort_order: i }).eq('id', g.id)
      )
    )
    onGroupsChange()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-slate-800 mb-4">Manage Groups</h3>

        <div className="space-y-2 mb-4">
          {localGroups.map((g, i) => (
            <div key={g.id} className="flex items-center gap-2">
              <input
                defaultValue={g.name}
                onBlur={(e) => renameGroup(g.id, e.target.value)}
                className="flex-1 border border-slate-200 rounded-md px-2 py-1 text-sm"
              />
              <button
                onClick={() => moveGroup(i, -1)}
                className="text-slate-400 hover:text-slate-700"
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => moveGroup(i, 1)}
                className="text-slate-400 hover:text-slate-700"
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => deleteGroup(g.id)}
                className="text-red-400 hover:text-red-600"
                title="Delete group"
              >
                ✕
              </button>
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
