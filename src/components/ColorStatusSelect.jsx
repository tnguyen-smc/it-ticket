import { useEffect, useRef, useState } from 'react'
import { hexToRgba, isLightColor } from '../lib/colors'

export default function ColorStatusSelect({ value, groups, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = groups.find((g) => g.name === value)
  const currentColor = current?.color || '#94A3B8'

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-xs font-medium rounded-full px-3 py-1.5 transition-all hover:brightness-95"
        style={{
          backgroundColor: hexToRgba(currentColor, 0.18),
          color: isLightColor(currentColor) ? '#334155' : currentColor,
          border: `1px solid ${hexToRgba(currentColor, 0.4)}`,
        }}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: currentColor }}
          />
          {value}
        </span>
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 py-1 overflow-hidden">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                onChange(g.name)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: g.color }}
              />
              <span className="text-slate-700">{g.name}</span>
              {g.name === value && (
                <svg className="w-3.5 h-3.5 ml-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
