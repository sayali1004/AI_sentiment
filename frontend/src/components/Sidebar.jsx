import { useState } from 'react'

const ALL_ORGS = [
  'anthropic', 'openai', 'google', 'microsoft', 'meta', 'nvidia',
  'amazon', 'apple', 'xai', 'mistral', 'deepseek',
  'anduril', 'palantir', 'department_of_defense',
]

function formatOrg(o) {
  return o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function MultiSelect({ options, value, onChange, formatFn = x => x }) {
  const [open, setOpen] = useState(false)

  const label = value.length === 0
    ? 'None selected'
    : value.length === options.length
      ? 'All selected'
      : `${value.length} selected`

  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt))
    else onChange([...value, opt])
  }

  return (
    <div className="multiselect-wrapper">
      <div
        className={`multiselect-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{label}</span>
        <span className={`multiselect-caret ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && (
        <div className="multiselect-dropdown">
          {options.map(opt => (
            <label key={opt} className="multiselect-item">
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
              />
              {formatFn(opt)}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ filters, onFiltersChange }) {
  const { startDate, endDate, selectedOrgs } = filters

  const today = new Date().toISOString().split('T')[0]
  const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">✦</div>
        <div>
          <div className="sidebar-logo-text">Observatory</div>
        </div>
      </div>

      <div>
        <div className="sidebar-section-label">Date Range</div>
        <div className="sidebar-field" style={{ marginBottom: 10 }}>
          <label>Start date</label>
          <input
            type="date"
            className="sidebar-input"
            value={startDate}
            min={yearAgo}
            max={endDate}
            onChange={e => onFiltersChange({ ...filters, startDate: e.target.value })}
          />
        </div>
        <div className="sidebar-field">
          <label>End date</label>
          <input
            type="date"
            className="sidebar-input"
            value={endDate}
            min={startDate}
            max={today}
            onChange={e => onFiltersChange({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="sidebar-section-label">Companies</div>
        <div className="sidebar-field">
          <MultiSelect
            options={ALL_ORGS}
            value={selectedOrgs}
            onChange={orgs => onFiltersChange({ ...filters, selectedOrgs: orgs })}
            formatFn={formatOrg}
          />
        </div>
        <p className="sidebar-caption" style={{ marginTop: 8 }}>
          Filter applies to Worldwide, US, and Data Centers tabs.
        </p>
      </div>

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        AI Sentiment Observatory<br />
        Powered by GDELT · Supabase · Groq
      </div>
    </aside>
  )
}
