import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export const ALL_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'problem', label: 'Problem description' },
  { key: 'date', label: 'Date submitted' },
  { key: 'notes', label: 'Internal notes' },
  { key: 'status', label: 'Status dropdown' },
]

const DEFAULTS = {
  School: { name: true, email: true, problem: true, date: true, notes: true, status: true },
  Parish: { name: true, email: true, problem: true, date: true, notes: true, status: true },
}

export function useDisplaySettings() {
  const [settings, setSettings] = useState(DEFAULTS)

  useEffect(() => {
    fetchSettings()

    const sub = supabase
      .channel('display-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_display_settings' },
        fetchSettings
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [])

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('app_display_settings').select('*')
    if (error) {
      console.error(error)
      return
    }
    if (data && data.length > 0) {
      const next = { ...DEFAULTS }
      data.forEach((row) => {
        next[row.category] = { ...DEFAULTS.School, ...row.fields }
      })
      setSettings(next)
    }
  }

  const update = async (category, field, value) => {
    const nextFields = { ...(settings[category] || DEFAULTS.School), [field]: value }
    setSettings((prev) => ({ ...prev, [category]: nextFields }))
    const { error } = await supabase
      .from('app_display_settings')
      .upsert({ category, fields: nextFields })
    if (error) console.error(error)
  }

  const getFieldsFor = (category) => settings[category] || DEFAULTS.School

  return { settings, update, getFieldsFor }
}
