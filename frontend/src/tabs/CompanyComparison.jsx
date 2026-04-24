import { useEffect, useState } from 'react'
import {
  getTimeseriesPerOrg,
  getSentimentByOrg,
  getTimeseriesPerOrgByCountry,
} from '../api.js'
import MetricCard from '../components/MetricCard.jsx'
import ChartCard, { SpacePlot, LINE_COLORS } from '../components/ChartCard.jsx'

const ALL_ORGS = [
  'anthropic', 'openai', 'google', 'microsoft', 'meta', 'nvidia',
  'amazon', 'apple', 'xai', 'mistral', 'deepseek',
  'anduril', 'palantir', 'department_of_defense',
]

function formatOrg(o) {
  return o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="orbit-loader" />
      <div className="loader-text">SCANNING SIGNALS...</div>
    </div>
  )
}

function OrgMultiSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)

  const label = value.length === 0
    ? 'None selected'
    : value.length === ALL_ORGS.length
      ? 'All selected'
      : `${value.length} selected`

  const toggle = (org) => {
    if (value.includes(org)) onChange(value.filter(v => v !== org))
    else onChange([...value, org])
  }

  return (
    <div className="multiselect-wrapper" style={{ maxWidth: 280, marginBottom: '1.5rem' }}>
      <div
        className={`multiselect-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{label}</span>
        <span className={`multiselect-caret ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && (
        <div className="multiselect-dropdown">
          {ALL_ORGS.map(org => (
            <label key={org} className="multiselect-item">
              <input
                type="checkbox"
                checked={value.includes(org)}
                onChange={() => toggle(org)}
              />
              {formatOrg(org)}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CompanyComparison({ filters }) {
  const { startDate, endDate } = filters

  const [selectedOrgs, setSelectedOrgs] = useState(['anthropic', 'openai', 'google'])
  const [orgSummary, setOrgSummary] = useState([])
  const [tsOrg, setTsOrg] = useState([])
  const [tsOrgUS, setTsOrgUS] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (selectedOrgs.length === 0) {
      setOrgSummary([])
      setTsOrg([])
      setTsOrgUS([])
      return
    }

    setLoading(true)
    setError(null)
    Promise.all([
      getSentimentByOrg(startDate, endDate, selectedOrgs),
      getTimeseriesPerOrg(startDate, endDate, selectedOrgs),
      getTimeseriesPerOrgByCountry(startDate, endDate, 'US', selectedOrgs),
    ])
      .then(([summary, ts, tsUS]) => {
        setOrgSummary(summary)
        setTsOrg(ts)
        setTsOrgUS(tsUS)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate, selectedOrgs])

  // Build summary table rows
  const summaryRows = orgSummary.map(row => {
    const usRows = tsOrgUS.filter(r => r.org_name === row.org_name)
    const usAvgTone = usRows.length
      ? usRows.reduce((s, r) => s + (r.avg_tone || 0), 0) / usRows.length
      : null
    const usArticles = usRows.reduce((s, r) => s + (r.article_count || 0), 0)
    return { ...row, usAvgTone, usArticles }
  }).sort((a, b) => (b.avg_tone || 0) - (a.avg_tone || 0))

  // Per-org traces — worldwide
  const orgNames = [...new Set(tsOrg.map(r => r.org_name))]
  const worldVolTraces = orgNames.map((org, i) => {
    const rows = tsOrg.filter(r => r.org_name === org)
    return {
      x: rows.map(r => r.date), y: rows.map(r => r.article_count),
      type: 'scatter', mode: 'lines',
      name: formatOrg(org),
      line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    }
  })
  const worldToneTraces = orgNames.map((org, i) => {
    const rows = tsOrg.filter(r => r.org_name === org)
    return {
      x: rows.map(r => r.date), y: rows.map(r => r.avg_tone),
      type: 'scatter', mode: 'lines',
      name: formatOrg(org),
      line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    }
  })

  // Per-org traces — US
  const orgNamesUS = [...new Set(tsOrgUS.map(r => r.org_name))]
  const usVolTraces = orgNamesUS.map((org, i) => {
    const rows = tsOrgUS.filter(r => r.org_name === org)
    return {
      x: rows.map(r => r.date), y: rows.map(r => r.article_count),
      type: 'scatter', mode: 'lines',
      name: formatOrg(org),
      line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    }
  })
  const usToneTraces = orgNamesUS.map((org, i) => {
    const rows = tsOrgUS.filter(r => r.org_name === org)
    return {
      x: rows.map(r => r.date), y: rows.map(r => r.avg_tone),
      type: 'scatter', mode: 'lines',
      name: formatOrg(org),
      line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    }
  })

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Company Comparison</div>
        <div className="page-subtitle">{startDate} → {endDate}</div>
      </div>

      <OrgMultiSelect value={selectedOrgs} onChange={setSelectedOrgs} />

      {selectedOrgs.length === 0 && (
        <div className="banner info">Select at least one company to see comparison charts.</div>
      )}

      {selectedOrgs.length > 0 && loading && <Loader />}

      {selectedOrgs.length > 0 && error && (
        <div className="banner error">Error: {error}</div>
      )}

      {selectedOrgs.length > 0 && !loading && !error && (
        <>
          {/* KPI row */}
          {summaryRows.length > 0 && (
            <div className="metrics-row">
              <MetricCard
                label="Companies Compared"
                value={summaryRows.length}
              />
              <MetricCard
                label="Highest Worldwide Tone"
                value={`${formatOrg(summaryRows[0].org_name)} (${summaryRows[0].avg_tone?.toFixed(2)})`}
              />
              <MetricCard
                label="Total Articles"
                value={summaryRows.reduce((s, r) => s + (r.article_count || 0), 0).toLocaleString()}
              />
            </div>
          )}

          {/* Summary table */}
          {summaryRows.length > 0 && (
            <>
              <hr className="divider" />
              <div className="section-header">Average Sentiment Summary</div>
              <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Worldwide Avg Tone</th>
                      <th>Worldwide Articles</th>
                      <th>US Avg Tone</th>
                      <th>US Articles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map(r => (
                      <tr key={r.org_name}>
                        <td>{formatOrg(r.org_name)}</td>
                        <td>{r.avg_tone?.toFixed(2) ?? '—'}</td>
                        <td>{r.article_count?.toLocaleString() ?? '—'}</td>
                        <td>{r.usAvgTone != null ? r.usAvgTone.toFixed(2) : '—'}</td>
                        <td>{r.usArticles > 0 ? r.usArticles.toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Worldwide charts */}
          {tsOrg.length > 0 && (
            <>
              <hr className="divider" />
              <div className="section-header">Worldwide</div>
              <div className="charts-row">
                <ChartCard title="DAILY SENTIMENT BY COMPANY">
                  <SpacePlot
                    data={worldToneTraces}
                    layout={{ yaxis: { title: 'Avg Tone' } }}
                  />
                </ChartCard>
                <ChartCard title="DAILY VOLUME BY COMPANY">
                  <SpacePlot
                    data={worldVolTraces}
                    layout={{ yaxis: { title: 'Articles' } }}
                  />
                </ChartCard>
              </div>
            </>
          )}

          {/* US charts */}
          {tsOrgUS.length > 0 && (
            <>
              <hr className="divider" />
              <div className="section-header">US</div>
              <div className="charts-row">
                <ChartCard title="DAILY SENTIMENT BY COMPANY (US)">
                  <SpacePlot
                    data={usToneTraces}
                    layout={{ yaxis: { title: 'Avg Tone' } }}
                  />
                </ChartCard>
                <ChartCard title="DAILY VOLUME BY COMPANY (US)">
                  <SpacePlot
                    data={usVolTraces}
                    layout={{ yaxis: { title: 'Articles' } }}
                  />
                </ChartCard>
              </div>
            </>
          )}

          {tsOrg.length === 0 && tsOrgUS.length === 0 && !loading && (
            <div className="banner info">No per-company data available for the selected range.</div>
          )}
        </>
      )}
    </div>
  )
}
