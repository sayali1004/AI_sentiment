import { useEffect, useState } from 'react'
import { getTopicThemes, getTopArticles } from '../api.js'
import ChartCard, { SpacePlot } from '../components/ChartCard.jsx'
import MetricCard from '../components/MetricCard.jsx'

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="orbit-loader" />
      <div className="loader-text">SCANNING SIGNALS...</div>
    </div>
  )
}

function ToneTag({ tone }) {
  const color = tone > 1 ? '#34d399' : tone < -1 ? '#fb7185' : '#94a3b8'
  return (
    <span style={{
      color,
      fontFamily: 'Space Mono, monospace',
      fontSize: 11,
      fontWeight: 700,
      minWidth: 46,
      display: 'inline-block',
    }}>
      {tone > 0 ? '+' : ''}{tone.toFixed(2)}
    </span>
  )
}

function ArticleTable({ rows, emptyMsg }) {
  if (!rows || rows.length === 0) return <div className="banner info">{emptyMsg}</div>
  return (
    <div className="expander-content" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Headline</th>
            <th>Tone</th>
            <th>Date</th>
            <th>Country</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ maxWidth: 460, wordBreak: 'break-word', fontSize: 12 }}>{r.title}</td>
              <td><ToneTag tone={r.avg_tone} /></td>
              <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{r.date || '—'}</td>
              <td style={{ fontSize: 12 }}>{r.country || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TopicDeepDive({ filters = {} }) {
  const { startDate, endDate, selectedOrgs = [] } = filters

  const [themes, setThemes] = useState(null)
  const [articles, setArticles] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!startDate || !endDate) return
    setLoading(true)
    setError(null)
    Promise.all([
      getTopicThemes(startDate, endDate, selectedOrgs),
      getTopArticles(startDate, endDate, selectedOrgs, 10),
    ])
      .then(([t, a]) => { setThemes(t); setArticles(a) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate, JSON.stringify(selectedOrgs)])

  if (loading) return <Loader />
  if (error) return <div className="banner error">Error: {error}</div>
  if (!themes) return null

  const totalPosThemes = themes.positive.reduce((s, r) => s + r.count, 0)
  const totalNegThemes = themes.negative.reduce((s, r) => s + r.count, 0)

  // Bar chart — positive themes
  const posTrace = {
    type: 'bar',
    orientation: 'h',
    x: [...themes.positive].reverse().map(r => r.count),
    y: [...themes.positive].reverse().map(r => r.theme),
    marker: { color: '#34d399', opacity: 0.85 },
    name: 'Positive',
    hovertemplate: '<b>%{y}</b><br>Articles: %{x}<extra></extra>',
  }

  // Bar chart — negative themes
  const negTrace = {
    type: 'bar',
    orientation: 'h',
    x: [...themes.negative].reverse().map(r => r.count),
    y: [...themes.negative].reverse().map(r => r.theme),
    marker: { color: '#fb7185', opacity: 0.85 },
    name: 'Negative',
    hovertemplate: '<b>%{y}</b><br>Articles: %{x}<extra></extra>',
  }

  const barLayout = {
    margin: { l: 160, r: 16, t: 28, b: 32 },
    hovermode: 'closest',
    xaxis: { title: 'Article count', gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { automargin: true, tickfont: { size: 11 } },
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Topic Deep Dive</div>
        <div className="page-subtitle">{startDate} → {endDate}</div>
      </div>

      <div className="metrics-row">
        <MetricCard label="Positive Theme Signals" value={totalPosThemes.toLocaleString()} />
        <MetricCard label="Negative Theme Signals" value={totalNegThemes.toLocaleString()} />
        <MetricCard
          label="Sentiment Ratio"
          value={
            totalPosThemes + totalNegThemes > 0
              ? `${Math.round((totalPosThemes / (totalPosThemes + totalNegThemes)) * 100)}% pos`
              : '—'
          }
        />
      </div>

      <hr className="divider" />
      <div className="section-header">Theme Distribution</div>

      <div className="charts-row">
        <ChartCard title="TOP POSITIVE THEMES">
          {themes.positive.length === 0
            ? <div className="banner info" style={{ margin: 16 }}>No positive themes detected.</div>
            : <SpacePlot data={[posTrace]} layout={{ ...barLayout, yaxis: { ...barLayout.yaxis, tickfont: { size: 11, color: '#34d399' } } }} />
          }
        </ChartCard>
        <ChartCard title="TOP NEGATIVE THEMES">
          {themes.negative.length === 0
            ? <div className="banner info" style={{ margin: 16 }}>No negative themes detected.</div>
            : <SpacePlot data={[negTrace]} layout={{ ...barLayout, yaxis: { ...barLayout.yaxis, tickfont: { size: 11, color: '#fb7185' } } }} />
          }
        </ChartCard>
      </div>

      <hr className="divider" />
      <div className="section-header">Most Positive Headlines</div>
      <ArticleTable rows={articles?.positive} emptyMsg="No positive articles found." />

      <hr className="divider" />
      <div className="section-header">Most Negative Headlines</div>
      <ArticleTable rows={articles?.negative} emptyMsg="No negative articles found." />
    </div>
  )
}
