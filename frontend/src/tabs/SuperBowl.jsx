import { useState, useEffect } from 'react'
import { getSentimentByOrg, getTimeseriesPerOrg, getTimeseriesPerOrgByCountry } from '../api.js'
import ChartCard, { SpacePlot, LINE_COLORS } from '../components/ChartCard.jsx'

const FOUNDATION_MODEL_ORGS = ['anthropic', 'openai', 'google', 'meta', 'xai', 'mistral', 'deepseek']
const SUPERBOWL_DATE = '2026-02-09'

function formatOrg(o) {
  return o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="orbit-loader" />
      <div className="loader-text">COMPUTING IMPACT...</div>
    </div>
  )
}

function MultiSelect({ options, value, onChange, formatFn = x => x }) {
  const [open, setOpen] = useState(false)
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt))
    else onChange([...value, opt])
  }
  const label = value.length === 0 ? 'None selected' : `${value.length} selected`
  return (
    <div className="multiselect-wrapper">
      <div className={`multiselect-trigger ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)}>
        <span>{label}</span>
        <span className={`multiselect-caret ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && (
        <div className="multiselect-dropdown">
          {options.map(opt => (
            <label key={opt} className="multiselect-item">
              <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
              {formatFn(opt)}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SuperBowl() {
  const [weeks, setWeeks] = useState(2)
  const [geo, setGeo] = useState('Worldwide')
  const [selectedOrgs, setSelectedOrgs] = useState(['anthropic', 'openai', 'google'])
  const [dataBefore, setDataBefore] = useState([])
  const [dataAfter, setDataAfter] = useState([])
  const [tsData, setTsData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const beforeEnd = addDays(SUPERBOWL_DATE, -1)
  const beforeStart = addDays(SUPERBOWL_DATE, -weeks * 7)
  const afterStart = addDays(SUPERBOWL_DATE, 1)
  const afterEnd = addDays(SUPERBOWL_DATE, weeks * 7)

  useEffect(() => {
    if (!selectedOrgs.length) return
    setLoading(true)
    setError(null)
    const fetchTs = geo === 'US only'
      ? getTimeseriesPerOrgByCountry(beforeStart, afterEnd, 'US', selectedOrgs)
      : getTimeseriesPerOrg(beforeStart, afterEnd, selectedOrgs)
    Promise.all([
      getSentimentByOrg(beforeStart, beforeEnd, selectedOrgs),
      getSentimentByOrg(afterStart, afterEnd, selectedOrgs),
      fetchTs,
    ])
      .then(([before, after, ts]) => {
        setDataBefore(before)
        setDataAfter(after)
        setTsData(ts)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [weeks, geo, selectedOrgs.join(',')])

  const combined = [
    ...dataBefore.map(r => ({ ...r, period: 'Before' })),
    ...dataAfter.map(r => ({ ...r, period: 'After' })),
  ]

  const orgsList = [...new Set(combined.map(r => r.org_name))]
  const beforeMap = Object.fromEntries(dataBefore.map(r => [r.org_name, r]))
  const afterMap = Object.fromEntries(dataAfter.map(r => [r.org_name, r]))

  const toneBefore = { x: orgsList.map(formatOrg), y: orgsList.map(o => beforeMap[o]?.avg_tone ?? 0), type: 'bar', name: 'Before', marker: { color: '#74add1' } }
  const toneAfter  = { x: orgsList.map(formatOrg), y: orgsList.map(o => afterMap[o]?.avg_tone ?? 0),  type: 'bar', name: 'After',  marker: { color: '#f46d43' } }
  const volBefore  = { x: orgsList.map(formatOrg), y: orgsList.map(o => beforeMap[o]?.article_count ?? 0), type: 'bar', name: 'Before', marker: { color: '#74add1' } }
  const volAfter   = { x: orgsList.map(formatOrg), y: orgsList.map(o => afterMap[o]?.article_count ?? 0),  type: 'bar', name: 'After',  marker: { color: '#f46d43' } }

  const tsOrgNames = [...new Set(tsData.map(r => r.org_name))]
  const tsTraces = tsOrgNames.map((org, i) => {
    const rows = tsData.filter(r => r.org_name === org)
    return {
      x: rows.map(r => r.date), y: rows.map(r => r.avg_tone),
      type: 'scatter', mode: 'lines',
      name: formatOrg(org),
      line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    }
  })

  const sbLine = {
    type: 'scatter',
    x: [SUPERBOWL_DATE, SUPERBOWL_DATE],
    y: [-20, 20],
    mode: 'lines',
    line: { color: '#fb7185', dash: 'dash', width: 1.5 },
    name: 'Super Bowl LX',
    showlegend: true,
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Super Bowl LX Analysis</div>
        <div className="page-subtitle">
          Did Anthropic's ad on Feb 9, 2026 shift AI sentiment?
        </div>
      </div>

      {/* Controls */}
      <div className="sb-controls">
        <div className="control-card">
          <div className="control-card-label">Window (weeks)</div>
          <div className="slider-wrapper">
            <div className="slider-row">
              <span className="slider-label">1 wk</span>
              <input type="range" min={1} max={4} value={weeks} onChange={e => setWeeks(+e.target.value)} />
              <span className="slider-label">4 wks</span>
            </div>
            <span className="slider-value" style={{ textAlign: 'center' }}>{weeks} week{weeks > 1 ? 's' : ''}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
            Before: {beforeStart} → {beforeEnd}<br />
            After: {afterStart} → {afterEnd}
          </div>
        </div>

        <div className="control-card">
          <div className="control-card-label">Geography</div>
          <div className="radio-group" style={{ flexDirection: 'column', gap: 6 }}>
            {['Worldwide', 'US only'].map(g => (
              <button key={g} className={`radio-btn ${geo === g ? 'selected' : ''}`} onClick={() => setGeo(g)}>{g}</button>
            ))}
          </div>
        </div>

        <div className="control-card">
          <div className="control-card-label">Companies</div>
          <MultiSelect
            options={FOUNDATION_MODEL_ORGS}
            value={selectedOrgs}
            onChange={setSelectedOrgs}
            formatFn={formatOrg}
          />
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}
      {loading && <Loader />}

      {!loading && selectedOrgs.length > 0 && (
        <>
          <hr className="divider" />
          <div className="section-header">Before vs After</div>
          <div className="charts-row">
            <ChartCard title="AVG TONE BEFORE VS AFTER">
              <SpacePlot
                data={[toneBefore, toneAfter]}
                layout={{ barmode: 'group', yaxis: { title: 'Avg Tone', zeroline: true } }}
              />
            </ChartCard>
            <ChartCard title="ARTICLE VOLUME BEFORE VS AFTER">
              <SpacePlot
                data={[volBefore, volAfter]}
                layout={{ barmode: 'group', yaxis: { title: 'Articles' } }}
              />
            </ChartCard>
          </div>

          <hr className="divider" />
          <div className="section-header">Daily Sentiment Across Full Window</div>
          <ChartCard className="full-width">
            <SpacePlot
              data={[...tsTraces, sbLine]}
              layout={{ hovermode: 'x unified', yaxis: { title: 'Avg Tone' } }}
            />
          </ChartCard>
        </>
      )}
    </div>
  )
}
