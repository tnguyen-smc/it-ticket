import { useEffect, useState } from 'react'

const STORAGE_KEY = 'it-dashboard-display-settings'

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
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setSettings({ ...DEFAULTS, ...JSON.parse(saved) })
      } catch {
        // ignore corrupt storage
      }
    }
  }, [])

  const update = (category, field, value) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        [category]: { ...prev[category], [field]: value },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const getFieldsFor = (category) => settings[category] || DEFAULTS.School

  return { settings, update, getFieldsFor }
}
