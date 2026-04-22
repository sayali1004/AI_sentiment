import { useEffect, useState } from 'react'
import {
  getSentimentByUsState,
  getTimeseriesByCountry,
  getTimeseriesPerOrgByCountry,
} from '../api.js'
import MetricCard from '../components/MetricCard.jsx'
import ChartCard, { SpacePlot, SENTIMENT_COLOR_SCALE, DARK_GEO_USA, LINE_COLORS } from '../components/ChartCard.jsx'

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

export default function US({ filters }) {
  const { startDate, endDate, selectedOrgs } = filters

  const [stateData, setStateData] = useState([])
  const [tsUs, setTsUs] = useState([])
  const [tsUsOrg, setTsUsOrg] = useState([])
  const [mapMetric, setMapMetric] = useState('Avg Sentiment')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getSentimentByUsState(startDate, endDate),
      getTimeseriesByCountry(startDate, endDate, 'US'),
    ])
      .then(([states, ts]) => {
        setStateData(states)
        setTsUs(ts)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate])

  useEffect(() => {
    if (selectedOrgs.length === 0) { setTsUsOrg([]); return }
    getTimeseriesPerOrgByCountry(startDate, endDate, 'US', selectedOrgs)
      .then(setTsUsOrg)
      .catch(() => setTsUsOrg([]))
  }, [startDate, endDate, selectedOrgs])

  if (loading) return <Loader />
  if (error) return <div className="banner error">Error: {error}</div>
  if (!stateData.length) return <div className="banner info">No US state data for the selected date range.</div>

  const totalArticles = stateData.reduce((s, r) => s + (r.article_count || 0), 0)
  const statesCovered = new Set(stateData.map(r => r.state_abbr)).size
  const avgTone = stateData.reduce((s, r) => s + (r.avg_tone || 0), 0) / (stateData.length || 1)

  const dates = tsUs.map(r => r.date)
  const volTrace = {
    x: dates, y: tsUs.map(r => r.article_count),
    type: 'scatter', mode: 'lines',
    line: { color: '#818cf8', width: 2 },
    fill: 'tozeroy', fillcolor: 'rgba(129,140,248,0.08)',
    name: 'Articles',
  }
  const toneTrace = {
    x: dates, y: tsUs.map(r => r.avg_tone),
    type: 'scatter', mode: 'lines',
    line: { color: '#a78bfa', width: 2 },
    fill: 'tozeroy', fillcolor: 'rgba(167,139,250,0.07)',
    name: 'Avg Tone',
  }

  const orgNames = [...new Set(tsUsOrg.map(r => r.org_name))]
  const orgVolTraces = orgNames.map((org, i) => {
    const rows = tsUsOrg.filter(r => r.org_name === org)
    return {
      x: rows.map(r => r.date), y: rows.map(r => r.article_count),
      type: 'scatter', mode: 'lines',
      name: formatOrg(org),
      line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    }
  })
  const orgToneTraces = orgNames.map((org, i) => {
    const rows = tsUsOrg.filter(r => r.org_name === org)
    return {
      x: rows.map(r => r.date), y: rows.map(r => r.avg_tone),
      type: 'scatter', mode: 'lines',
      name: formatOrg(org),
      line: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    }
  })

  const mapData = stateData.filter(r => r.state_abbr)
  const mapTrace = mapMetric === 'Avg Sentiment'
    ? [{
        type: 'choropleth',
        locationmode: 'USA-states',
        locations: mapData.map(r => r.state_abbr),
        z: mapData.map(r => r.avg_tone),
        zmin: -5, zmax: 5,
        colorscale: SENTIMENT_COLOR_SCALE,
        text: mapData.map(r => `${r.state_abbr}<br>Tone: ${r.avg_tone?.toFixed(2)}<br>Articles: ${r.article_count}`),
        hoverinfo: 'text',
        showscale: true,
        colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Tone', font: { color: '#94a3b8' } } },
      }]
    : [{
        type: 'choropleth',
        locationmode: 'USA-states',
        locations: mapData.map(r => r.state_abbr),
        z: mapData.map(r => r.article_count),
        colorscale: 'Blues',
        text: mapData.map(r => `${r.state_abbr}<br>Articles: ${r.article_count}`),
        hoverinfo: 'text',
        showscale: true,
        colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Articles', font: { color: '#94a3b8' } } },
      }]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">US AI Sentiment</div>
        <div className="page-subtitle">{startDate} → {endDate}</div>
      </div>

      <div className="metrics-row">
        <MetricCard label="US Avg Tone" value={avgTone.toFixed(2)} />
        <MetricCard label="Total US Articles" value={totalArticles.toLocaleString()} />
        <MetricCard label="States Covered" value={statesCovered} />
      </div>

      <hr className="divider" />
      <div className="section-header">Overall US Trends</div>

      <div className="charts-row">
        <ChartCard title="DAILY ARTICLE VOLUME · US">
          <SpacePlot data={[volTrace]} layout={{ yaxis: { title: 'Articles' } }} />
        </ChartCard>
        <ChartCard title="DAILY AVG TONE · US">
          <SpacePlot
            data={[toneTrace, {
              type: 'scatter', x: dates, y: dates.map(() => 0),
              mode: 'lines', line: { color: 'rgba(255,255,255,0.15)', dash: 'dot', width: 1 },
              showlegend: false,
            }]}
            layout={{ yaxis: { title: 'Tone' } }}
          />
        </ChartCard>
      </div>

      {selectedOrgs.length > 0 && (
        <>
          <hr className="divider" />
          <div className="section-header">By Company (US)</div>
          {tsUsOrg.length === 0
            ? <div className="banner info">No per-company US data for this range.</div>
            : (
              <div className="charts-row">
                <ChartCard title="DAILY VOLUME BY COMPANY · US">
                  <SpacePlot data={orgVolTraces} layout={{ yaxis: { title: 'Articles' } }} />
                </ChartCard>
                <ChartCard title="DAILY SENTIMENT BY COMPANY · US">
                  <SpacePlot data={orgToneTraces} layout={{ yaxis: { title: 'Avg Tone' } }} />
                </ChartCard>
              </div>
            )
          }
        </>
      )}

      <hr className="divider" />
      <div className="section-header">US State Map</div>

      <div className="radio-group">
        {['Avg Sentiment', 'Total Volume'].map(m => (
          <button
            key={m}
            className={`radio-btn ${mapMetric === m ? 'selected' : ''}`}
            onClick={() => setMapMetric(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <ChartCard className="full-width" style={{ height: 420 }}>
        <SpacePlot
          data={mapTrace}
          layout={{ geo: DARK_GEO_USA, margin: { l: 0, r: 0, t: 0, b: 0 } }}
          style={{ height: 390 }}
        />
      </ChartCard>

      {/* Raw data */}
      <div className="expander">
        <details>
          <summary className="expander-trigger" style={{ listStyle: 'none', cursor: 'pointer' }}>
            <span>Raw US state data ({stateData.length} rows)</span>
            <span>▼</span>
          </summary>
          <div className="expander-content">
            <table className="data-table">
              <thead>
                <tr><th>State</th><th>Avg Tone</th><th>Articles</th></tr>
              </thead>
              <tbody>
                {[...stateData].sort((a, b) => b.article_count - a.article_count).map(r => (
                  <tr key={r.adm1_code}>
                    <td>{r.state_abbr || r.adm1_code}</td>
                    <td>{r.avg_tone?.toFixed(2)}</td>
                    <td>{r.article_count?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  )
}
