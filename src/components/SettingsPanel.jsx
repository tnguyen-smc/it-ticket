import { ALL_FIELDS } from '../hooks/useDisplaySettings'

export default function SettingsPanel({ settings, onUpdate }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Display Settings</h2>
      <p className="text-sm text-slate-500 mb-6">
        Choose which fields show on ticket cards in List and Kanban views, separately for
        School and Parish requests.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {['School', 'Parish'].map((category) => (
          <div key={category} className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-3">{category}</h3>
            <div className="space-y-2">
              {ALL_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settings[category]?.[field.key] ?? true}
                    onChange={(e) => onUpdate(category, field.key, e.target.checked)}
                    className="rounded"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        These settings are saved on this device/browser only.
      </p>
    </div>
  )
}
