import { ALL_FIELDS } from '../hooks/useDisplaySettings'

export default function SettingsPanel({ settings, onUpdate, groups, appSettings, onUpdateAppSettings }) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">New Request Routing</h2>
        <p className="text-sm text-slate-500 mb-3">
          Which group a request lands in automatically when someone submits it from the
          public /help form.
        </p>
        <select
          value={appSettings?.defaultIntakeGroup || 'New'}
          onChange={(e) => onUpdateAppSettings({ defaultIntakeGroup: e.target.value })}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Sort Order Within Groups</h2>
        <p className="text-sm text-slate-500 mb-3">
          Applies globally, to every group/column in both List and Kanban views.
        </p>
        <div className="flex gap-3">
          {[
            { value: 'date', label: 'Date submitted (newest first)' },
            { value: 'alpha', label: 'Alphabetical' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-white border border-slate-200 rounded-lg px-3 py-2"
            >
              <input
                type="radio"
                name="sortMode"
                checked={(appSettings?.sortMode || 'date') === opt.value}
                onChange={() => onUpdateAppSettings({ sortMode: opt.value })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Public Quick Status (on /help)</h2>
        <p className="text-sm text-slate-500 mb-3">
          Which categories of requests show up in the public queue preview on the
          submission page. Statuses shown there are still controlled by the Sidebar's
          "Configure" option.
        </p>
        <div className="flex gap-3">
          {['School', 'Parish'].map((cat) => {
            const current = appSettings?.publicSummaryCategories || ['School', 'Parish']
            const checked = current.includes(cat)
            return (
              <label
                key={cat}
                className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-white border border-slate-200 rounded-lg px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...current, cat]
                      : current.filter((c) => c !== cat)
                    onUpdateAppSettings({ publicSummaryCategories: next })
                  }}
                  className="rounded"
                />
                {cat}
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Display Settings</h2>
        <p className="text-sm text-slate-500 mb-3">
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
      </div>

      <p className="text-xs text-slate-400">
        All settings on this page are saved centrally and apply for every admin, on any device.
      </p>
    </div>
  )
}