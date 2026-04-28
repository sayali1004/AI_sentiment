import { useEffect, useState } from 'react'
import {
  getSentimentByCountry,
  getSentimentTimeseries,
} from '../api.js'
import MetricCard from '../components/MetricCard.jsx'
import ChartCard, { SpacePlot, SENTIMENT_COLOR_SCALE, DARK_GEO } from '../components/ChartCard.jsx'

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="orbit-loader" />
      <div className="loader-text">SCANNING SIGNALS...</div>
    </div>
  )
}

export default function Worldwide({ filters }) {
  const { startDate, endDate } = filters

  const [worldData, setWorldData] = useState([])
  const [tsAll, setTsAll] = useState([])
  const [mapMetric, setMapMetric] = useState('Avg Sentiment')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getSentimentByCountry(startDate, endDate),
      getSentimentTimeseries(startDate, endDate),
    ])
      .then(([world, ts]) => {
        setWorldData(world)
        setTsAll(ts)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate])

  if (loading) return <Loader />
  if (error) return <div className="banner error">{error.includes('fetch') ? 'Backend is taking a while to start — please refresh in a moment.' : `Error: ${error}`}</div>
  if (!worldData.length) return <div className="banner info">No data available for the selected date range.</div>

  // KPIs
  const totalArticles = worldData.reduce((s, r) => s + (r.article_count || 0), 0)
  const countriesCovered = new Set(worldData.map(r => r.country_code)).size
  const globalAvgTone = worldData.reduce((s, r) => s + (r.avg_tone || 0), 0) / (worldData.length || 1)

  // Timeseries charts — all AI
  const tsAllDates = tsAll.map(r => r.date)
  const volTrace = {
    x: tsAllDates, y: tsAll.map(r => r.article_count),
    type: 'scatter', mode: 'lines',
    line: { color: '#818cf8', width: 2 },
    fill: 'tozeroy', fillcolor: 'rgba(129,140,248,0.08)',
    name: 'Articles',
  }
  const toneTrace = {
    x: tsAllDates, y: tsAll.map(r => r.avg_tone),
    type: 'scatter', mode: 'lines',
    line: { color: '#a78bfa', width: 2 },
    fill: 'tozeroy', fillcolor: 'rgba(167,139,250,0.07)',
    name: 'Avg Tone',
  }

  // World map
  const mapped = worldData.filter(r => r.iso3)
  const mapTrace = () => {
    if (mapMetric === 'Avg Sentiment') {
      return [{
        type: 'choropleth',
        locations: mapped.map(r => r.iso3),
        z: mapped.map(r => r.avg_tone),
        zmin: -5, zmax: 5,
        colorscale: SENTIMENT_COLOR_SCALE,
        text: mapped.map(r => `${r.country_code}<br>Articles: ${r.article_count}<br>Tone: ${r.avg_tone?.toFixed(2)}`),
        hoverinfo: 'text',
        showscale: true,
        colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Tone', font: { color: '#94a3b8' } } },
      }]
    }
    const VOLUME_SCALE = [
      [0, '#ede9fe'], [0.25, '#a78bfa'], [0.5, '#7c3aed'], [0.75, '#4c1d95'], [1, '#2e0a6e'],
    ]
    if (mapMetric === 'Total Volume') {
      return [{
        type: 'choropleth',
        locations: mapped.map(r => r.iso3),
        z: mapped.map(r => r.article_count),
        colorscale: VOLUME_SCALE,
        text: mapped.map(r => `${r.country_code}<br>Articles: ${r.article_count}`),
        hoverinfo: 'text',
        showscale: true,
        colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Articles', font: { color: '#94a3b8' } } },
      }]
    }
    const apm = mapped.filter(r => r.articles_per_million != null)
    return [{
      type: 'choropleth',
      locations: apm.map(r => r.iso3),
      z: apm.map(r => r.articles_per_million),
      zmax: 120,
      colorscale: VOLUME_SCALE,
      text: apm.map(r => `${r.country_code}<br>Per million: ${r.articles_per_million?.toFixed(1)}`),
      hoverinfo: 'text',
      showscale: true,
      colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Per 1M', font: { color: '#94a3b8' } } },
    }]
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Worldwide AI Sentiment</div>
        <div className="page-subtitle">
          {startDate} → {endDate}
        </div>
      </div>

      {/* KPIs */}
      <div className="metrics-row">
        <MetricCard label="Global Avg Tone" value={globalAvgTone.toFixed(2)} />
        <MetricCard label="Total Articles" value={totalArticles.toLocaleString()} />
        <MetricCard label="Countries Covered" value={countriesCovered} />
      </div>

      <hr className="divider" />
      <div className="section-header">Overall Trends</div>

      <div className="charts-row">
        <ChartCard title="DAILY ARTICLE VOLUME · ALL AI">
          <SpacePlot
            data={[volTrace]}
            layout={{ xaxis: { title: '' }, yaxis: { title: 'Articles' } }}
          />
        </ChartCard>
        <ChartCard title="DAILY AVG TONE · ALL AI">
          <SpacePlot
            data={[toneTrace, { type: 'scatter', x: tsAllDates, y: tsAllDates.map(() => 0), mode: 'lines', line: { color: 'rgba(255,255,255,0.15)', dash: 'dot', width: 1 }, showlegend: false }]}
            layout={{ yaxis: { title: 'Tone' } }}
          />
        </ChartCard>
      </div>

      <hr className="divider" />
      <div className="section-header">World Map</div>

      <div className="radio-group">
        {['Avg Sentiment', 'Total Volume', 'Volume per Million People'].map(m => (
          <button
            key={m}
            className={`radio-btn ${mapMetric === m ? 'selected' : ''}`}
            onClick={() => setMapMetric(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <ChartCard className="full-width" style={{ height: 460 }}>
        <SpacePlot
          data={mapTrace()}
          layout={{
            geo: DARK_GEO,
            margin: { l: 0, r: 0, t: 0, b: 0 },
          }}
          style={{ height: 430 }}
        />
      </ChartCard>

      {/* Raw data */}
      <RawExpander data={worldData} />
    </div>
  )
}

function RawExpander({ data }) {
  const [open, setOpen] = useState(false)
  const sorted = [...data].sort((a, b) => b.article_count - a.article_count)
  return (
    <div className="expander">
      <div className="expander-trigger" onClick={() => setOpen(o => !o)}>
        <span>Raw country data ({data.length} rows)</span>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="expander-content">
          <table className="data-table">
            <thead>
              <tr>
                <th>Country</th><th>ISO3</th><th>Avg Tone</th>
                <th>Articles</th><th>Per Million</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.country_code}>
                  <td>{r.country_code}</td>
                  <td>{r.iso3 || '—'}</td>
                  <td>{r.avg_tone?.toFixed(2)}</td>
                  <td>{r.article_count?.toLocaleString()}</td>
                  <td>{r.articles_per_million?.toFixed(1) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
