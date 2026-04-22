import { useEffect, useState } from 'react'
import {
  getSentimentByCountry,
  getSentimentTimeseries,
  getSentimentByUsState,
} from '../api.js'
import MetricCard from '../components/MetricCard.jsx'
import ChartCard, { SpacePlot, SENTIMENT_COLOR_SCALE, DARK_GEO, DARK_GEO_USA } from '../components/ChartCard.jsx'

const DC_FILTER = ['data_center']

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="orbit-loader" />
      <div className="loader-text">MAPPING INFRASTRUCTURE...</div>
    </div>
  )
}

export default function DataCenters({ filters }) {
  const { startDate, endDate } = filters

  const [worldData, setWorldData] = useState([])
  const [tsData, setTsData] = useState([])
  const [usData, setUsData] = useState([])
  const [worldMetric, setWorldMetric] = useState('Avg Sentiment')
  const [usMetric, setUsMetric] = useState('Avg Sentiment')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getSentimentByCountry(startDate, endDate, DC_FILTER),
      getSentimentTimeseries(startDate, endDate, DC_FILTER),
      getSentimentByUsState(startDate, endDate, DC_FILTER),
    ])
      .then(([world, ts, us]) => {
        setWorldData(world)
        setTsData(ts)
        setUsData(us)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate])

  if (loading) return <Loader />
  if (error) return <div className="banner error">Error: {error}</div>
  if (!worldData.length) return (
    <div className="banner info">
      No data center articles found for the selected date range.
      The backfill pipeline may still be running.
    </div>
  )

  const totalArticles = worldData.reduce((s, r) => s + (r.article_count || 0), 0)
  const countriesCovered = new Set(worldData.map(r => r.country_code)).size
  const globalAvgTone = worldData.reduce((s, r) => s + (r.avg_tone || 0), 0) / (worldData.length || 1)

  const dates = tsData.map(r => r.date)
  const volTrace = {
    x: dates, y: tsData.map(r => r.article_count),
    type: 'scatter', mode: 'lines',
    line: { color: '#34d399', width: 2 },
    fill: 'tozeroy', fillcolor: 'rgba(52,211,153,0.07)',
    name: 'Articles',
  }
  const toneTrace = {
    x: dates, y: tsData.map(r => r.avg_tone),
    type: 'scatter', mode: 'lines',
    line: { color: '#fbbf24', width: 2 },
    fill: 'tozeroy', fillcolor: 'rgba(251,191,36,0.07)',
    name: 'Avg Tone',
  }

  const mapped = worldData.filter(r => r.iso3)
  const worldTrace = worldMetric === 'Avg Sentiment'
    ? [{ type: 'choropleth', locations: mapped.map(r => r.iso3), z: mapped.map(r => r.avg_tone), zmin: -5, zmax: 5, colorscale: SENTIMENT_COLOR_SCALE, text: mapped.map(r => `${r.country_code}<br>Tone: ${r.avg_tone?.toFixed(2)}<br>Articles: ${r.article_count}`), hoverinfo: 'text', showscale: true, colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Tone', font: { color: '#94a3b8' } } } }]
    : [{ type: 'choropleth', locations: mapped.map(r => r.iso3), z: mapped.map(r => r.article_count), colorscale: 'Blues', text: mapped.map(r => `${r.country_code}<br>Articles: ${r.article_count}`), hoverinfo: 'text', showscale: true, colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Articles', font: { color: '#94a3b8' } } } }]

  const usMapped = usData.filter(r => r.state_abbr)
  const usTrace = usMetric === 'Avg Sentiment'
    ? [{ type: 'choropleth', locationmode: 'USA-states', locations: usMapped.map(r => r.state_abbr), z: usMapped.map(r => r.avg_tone), zmin: -5, zmax: 5, colorscale: SENTIMENT_COLOR_SCALE, text: usMapped.map(r => `${r.state_abbr}<br>Tone: ${r.avg_tone?.toFixed(2)}`), hoverinfo: 'text', showscale: true, colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Tone', font: { color: '#94a3b8' } } } }]
    : [{ type: 'choropleth', locationmode: 'USA-states', locations: usMapped.map(r => r.state_abbr), z: usMapped.map(r => r.article_count), colorscale: 'Blues', text: usMapped.map(r => `${r.state_abbr}<br>Articles: ${r.article_count}`), hoverinfo: 'text', showscale: true, colorbar: { tickfont: { color: '#94a3b8' }, title: { text: 'Articles', font: { color: '#94a3b8' } } } }]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Data Center Sentiment</div>
        <div className="page-subtitle">{startDate} → {endDate}</div>
      </div>

      <div className="metrics-row">
        <MetricCard label="Total Articles" value={totalArticles.toLocaleString()} />
        <MetricCard label="Countries Covered" value={countriesCovered} />
        <MetricCard label="Global Avg Tone" value={globalAvgTone.toFixed(2)} />
      </div>

      <hr className="divider" />
      <div className="section-header">Overall Trends</div>

      <div className="charts-row">
        <ChartCard title="DAILY ARTICLE VOLUME · DATA CENTERS">
          <SpacePlot data={[volTrace]} layout={{ yaxis: { title: 'Articles' } }} />
        </ChartCard>
        <ChartCard title="DAILY AVG TONE · DATA CENTERS">
          <SpacePlot data={[toneTrace]} layout={{ yaxis: { title: 'Tone' } }} />
        </ChartCard>
      </div>

      <hr className="divider" />
      <div className="section-header">World Map</div>

      <div className="radio-group">
        {['Avg Sentiment', 'Total Volume'].map(m => (
          <button key={m} className={`radio-btn ${worldMetric === m ? 'selected' : ''}`} onClick={() => setWorldMetric(m)}>{m}</button>
        ))}
      </div>

      <ChartCard className="full-width" style={{ height: 460 }}>
        <SpacePlot
          data={worldTrace}
          layout={{ geo: DARK_GEO, margin: { l: 0, r: 0, t: 0, b: 0 } }}
          style={{ height: 430 }}
        />
      </ChartCard>

      {usMapped.length > 0 && (
        <>
          <hr className="divider" />
          <div className="section-header">US State Map</div>

          <div className="radio-group">
            {['Avg Sentiment', 'Total Volume'].map(m => (
              <button key={m} className={`radio-btn ${usMetric === m ? 'selected' : ''}`} onClick={() => setUsMetric(m)}>{m}</button>
            ))}
          </div>

          <ChartCard className="full-width" style={{ height: 420 }}>
            <SpacePlot
              data={usTrace}
              layout={{ geo: DARK_GEO_USA, margin: { l: 0, r: 0, t: 0, b: 0 } }}
              style={{ height: 390 }}
            />
          </ChartCard>
        </>
      )}
    </div>
  )
}
