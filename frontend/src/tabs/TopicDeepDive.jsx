import { useEffect, useState } from 'react'
import { getTopicThemes, getTopArticles, getThemesByState, getSentimentByUsState } from '../api.js'
import ChartCard, { SpacePlot } from '../components/ChartCard.jsx'
import MetricCard from '../components/MetricCard.jsx'

const US_STATE_NAMES = {
  'USAL':'Alabama','USAK':'Alaska','USAZ':'Arizona','USAR':'Arkansas',
  'USCA':'California','USCO':'Colorado','USCT':'Connecticut','USDE':'Delaware',
  'USFL':'Florida','USGA':'Georgia','USHI':'Hawaii','USID':'Idaho',
  'USIL':'Illinois','USIN':'Indiana','USIA':'Iowa','USKS':'Kansas',
  'USKY':'Kentucky','USLA':'Louisiana','USME':'Maine','USMD':'Maryland',
  'USMA':'Massachusetts','USMI':'Michigan','USMN':'Minnesota','USMS':'Mississippi',
  'USMO':'Missouri','USMT':'Montana','USNE':'Nebraska','USNV':'Nevada',
  'USNH':'New Hampshire','USNJ':'New Jersey','USNM':'New Mexico','USNY':'New York',
  'USNC':'North Carolina','USND':'North Dakota','USOH':'Ohio','USOK':'Oklahoma',
  'USOR':'Oregon','USPA':'Pennsylvania','USRI':'Rhode Island','USSC':'South Carolina',
  'USSD':'South Dakota','USTN':'Tennessee','USTX':'Texas','USUT':'Utah',
  'USVT':'Vermont','USVA':'Virginia','USWA':'Washington','USWV':'West Virginia',
  'USWI':'Wisconsin','USWY':'Wyoming','USDC':'Washington D.C.',
}

function stateName(code) {
  return US_STATE_NAMES[code] || code?.replace('US', '') || code
}

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
    <span style={{ color, fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, minWidth: 46, display: 'inline-block' }}>
      {tone > 0 ? '+' : ''}{tone.toFixed(2)}
    </span>
  )
}

function isLegible(title) {
  if (!title || title.length < 25) return false
  if (/&#x?[0-9a-fA-F]+;|&[a-zA-Z]+;/.test(title)) return false
  if (/https?:\/\/|www\.|\b\w+\.(net|com|org|io|co)\b/i.test(title)) return false
  if (/[-|]\s*[A-Z][^\s]+\.[a-z]{2,4}\s*$/.test(title)) return false
  const words = title.split(/\s+/)
  if (words.length < 5) return false
  const ascii = [...title].filter(c => c.charCodeAt(0) < 128).length
  if (ascii / title.length < 0.85) return false
  const alpha = [...title].filter(c => /[a-zA-Z]/.test(c)).length
  if (alpha / title.length < 0.55) return false
  return true
}

function ArticleTable({ rows, emptyMsg }) {
  const filtered = (rows || []).filter(r => isLegible(r.title)).slice(0, 10)
  if (filtered.length === 0) return <div className="banner info">{emptyMsg}</div>
  return (
    <div className="expander-content" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr><th>Headline</th><th>Tone</th><th>Date</th><th>Country</th></tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
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

function StateDropdown({ label, value, onChange, states, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          background: 'var(--space-mid)',
          border: '1px solid var(--glass-border)',
          borderRadius: 8,
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          padding: '7px 12px',
          fontSize: 13,
          fontFamily: 'Space Grotesk, sans-serif',
          cursor: disabled ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        <option value="">— Select state —</option>
        {states.map(s => (
          <option key={s.adm1_code} value={s.adm1_code}>
            {stateName(s.adm1_code)}
          </option>
        ))}
      </select>
    </div>
  )
}

function buildComparisonTraces(dataA, dataB, nameA, nameB, key) {
  const allThemes = [...new Set([
    ...(dataA?.[key] || []).map(r => r.theme),
    ...(dataB?.[key] || []).map(r => r.theme),
  ])]
  allThemes.sort((a, b) => {
    const sumA = ((dataA?.[key] || []).find(r => r.theme === a)?.count || 0)
    const sumB = ((dataA?.[key] || []).find(r => r.theme === b)?.count || 0)
    return sumB - sumA
  })

  const countsA = allThemes.map(t => (dataA?.[key] || []).find(r => r.theme === t)?.count || 0)
  const countsB = allThemes.map(t => (dataB?.[key] || []).find(r => r.theme === t)?.count || 0)

  return [
    {
      type: 'bar', orientation: 'h', name: nameA,
      x: [...countsA].reverse(), y: [...allThemes].reverse(),
      marker: { color: '#38bdf8', opacity: 0.85 },
      hovertemplate: `<b>${nameA}</b><br>%{y}: %{x}<extra></extra>`,
    },
    {
      type: 'bar', orientation: 'h', name: nameB,
      x: [...countsB].reverse(), y: [...allThemes].reverse(),
      marker: { color: '#a78bfa', opacity: 0.85 },
      hovertemplate: `<b>${nameB}</b><br>%{y}: %{x}<extra></extra>`,
    },
  ]
}

export default function TopicDeepDive({ filters = {} }) {
  const { startDate, endDate, selectedOrgs = [] } = filters

  // Global themes + articles
  const [themes, setThemes] = useState(null)
  const [articles, setArticles] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // State comparison
  const [availableStates, setAvailableStates] = useState([])
  const [stateA, setStateA] = useState('')
  const [stateB, setStateB] = useState('')
  const [stateDataA, setStateDataA] = useState(null)
  const [stateDataB, setStateDataB] = useState(null)
  const [stateLoading, setStateLoading] = useState(false)
  const [stateError, setStateError] = useState(null)

  // Load global data
  useEffect(() => {
    if (!startDate || !endDate) return
    setLoading(true)
    setError(null)
    Promise.all([
      getTopicThemes(startDate, endDate, selectedOrgs),
      getTopArticles(startDate, endDate, selectedOrgs, 50),
      getSentimentByUsState(startDate, endDate),
    ])
      .then(([t, a, states]) => {
        setThemes(t)
        setArticles(a)
        const sorted = [...states]
          .filter(s => s.adm1_code && s.adm1_code !== 'US')
          .sort((a, b) => b.article_count - a.article_count)
        setAvailableStates(sorted)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate, JSON.stringify(selectedOrgs)])

  // Load state comparison data when both states chosen
  useEffect(() => {
    if (!stateA || !stateB || !startDate || !endDate) return
    setStateLoading(true)
    setStateError(null)
    setStateDataA(null)
    setStateDataB(null)
    Promise.all([
      getThemesByState(stateA, startDate, endDate),
      getThemesByState(stateB, startDate, endDate),
    ])
      .then(([a, b]) => { setStateDataA(a); setStateDataB(b) })
      .catch(e => setStateError(e.message))
      .finally(() => setStateLoading(false))
  }, [stateA, stateB, startDate, endDate])

  if (loading) return <Loader />
  if (error) return <div className="banner error">Error: {error}</div>
  if (!themes) return null

  const totalPosThemes = themes.positive.reduce((s, r) => s + r.count, 0)
  const totalNegThemes = themes.negative.reduce((s, r) => s + r.count, 0)

  const barLayoutBase = {
    barmode: 'group',
    margin: { l: 160, r: 16, t: 28, b: 32 },
    hovermode: 'closest',
    xaxis: { title: 'Article count', gridcolor: 'rgba(255,255,255,0.05)' },
    yaxis: { automargin: true, tickfont: { size: 11 } },
  }

  const posTrace = {
    type: 'bar', orientation: 'h',
    x: [...themes.positive].reverse().map(r => r.count),
    y: [...themes.positive].reverse().map(r => r.theme),
    marker: { color: '#34d399', opacity: 0.85 },
    hovertemplate: '<b>%{y}</b><br>Articles: %{x}<extra></extra>',
  }
  const negTrace = {
    type: 'bar', orientation: 'h',
    x: [...themes.negative].reverse().map(r => r.count),
    y: [...themes.negative].reverse().map(r => r.theme),
    marker: { color: '#fb7185', opacity: 0.85 },
    hovertemplate: '<b>%{y}</b><br>Articles: %{x}<extra></extra>',
  }

  const nameA = stateName(stateA)
  const nameB = stateName(stateB)
  const compPosTraces = stateDataA && stateDataB ? buildComparisonTraces(stateDataA, stateDataB, nameA, nameB, 'positive') : []
  const compNegTraces = stateDataA && stateDataB ? buildComparisonTraces(stateDataA, stateDataB, nameA, nameB, 'negative') : []

  return (
    <div>
      <div className="page-header">
        <div className="page-title">State Comparison</div>
        <div className="page-subtitle">{startDate} → {endDate}</div>
      </div>

      {/* ── State vs State ── */}
      <div className="section-header">State vs State Comparison</div>

      {/* Dropdowns */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StateDropdown
          label="State A"
          value={stateA}
          onChange={v => { setStateA(v); setStateDataA(null) }}
          states={availableStates}
          disabled={availableStates.length === 0}
        />

        <div style={{
          fontSize: 20, fontWeight: 700, color: 'var(--stellar)',
          fontFamily: 'Space Mono, monospace', paddingBottom: 8, flexShrink: 0,
        }}>
          VS
        </div>

        <StateDropdown
          label="State B"
          value={stateB}
          onChange={v => { setStateB(v); setStateDataB(null) }}
          states={availableStates}
          disabled={availableStates.length === 0}
        />

        {stateA && stateB && (
          <div style={{ paddingBottom: 8, color: 'var(--text-muted)', fontSize: 12 }}>
            {stateLoading ? 'Loading…' : stateDataA && stateDataB
              ? `${stateDataA.article_count.toLocaleString()} vs ${stateDataB.article_count.toLocaleString()} articles`
              : ''}
          </div>
        )}
      </div>

      {!stateA || !stateB
        ? (
          <div className="banner info">Select two states above to compare their top themes.</div>
        )
        : stateLoading
        ? <Loader />
        : stateError
        ? <div className="banner error">Error: {stateError}</div>
        : stateDataA && stateDataB && (
          <>
            {/* State KPIs */}
            <div className="metrics-row">
              <MetricCard label={`${nameA} · Articles`} value={stateDataA.article_count.toLocaleString()} />
              <MetricCard label={`${nameB} · Articles`} value={stateDataB.article_count.toLocaleString()} />
              <MetricCard
                label="Difference"
                value={Math.abs(stateDataA.article_count - stateDataB.article_count).toLocaleString()}
              />
            </div>

            <div className="charts-row" style={{ marginTop: 16 }}>
              <ChartCard title={`POSITIVE THEMES · ${nameA.toUpperCase()} VS ${nameB.toUpperCase()}`}>
                {compPosTraces[0]?.x.length === 0 && compPosTraces[1]?.x.length === 0
                  ? <div className="banner info" style={{ margin: 16 }}>No positive themes found for either state.</div>
                  : <SpacePlot data={compPosTraces} layout={{ ...barLayoutBase, barmode: 'group' }} />
                }
              </ChartCard>
              <ChartCard title={`NEGATIVE THEMES · ${nameA.toUpperCase()} VS ${nameB.toUpperCase()}`}>
                {compNegTraces[0]?.x.length === 0 && compNegTraces[1]?.x.length === 0
                  ? <div className="banner info" style={{ margin: 16 }}>No negative themes found for either state.</div>
                  : <SpacePlot data={compNegTraces} layout={{ ...barLayoutBase, barmode: 'group' }} />
                }
              </ChartCard>
            </div>
          </>
        )
      }

      {/* Global KPIs */}
      <hr className="divider" />
      <div className="metrics-row">
        <MetricCard label="Positive Theme Signals" value={totalPosThemes.toLocaleString()} />
        <MetricCard label="Negative Theme Signals" value={totalNegThemes.toLocaleString()} />
        <MetricCard
          label="Sentiment Ratio"
          value={totalPosThemes + totalNegThemes > 0
            ? `${Math.round((totalPosThemes / (totalPosThemes + totalNegThemes)) * 100)}% pos`
            : '—'}
        />
      </div>

      {/* Global theme charts */}
      <hr className="divider" />
      <div className="section-header">Global Theme Distribution</div>
      <div className="charts-row">
        <ChartCard title="TOP POSITIVE THEMES">
          {themes.positive.length === 0
            ? <div className="banner info" style={{ margin: 16 }}>No positive themes detected.</div>
            : <SpacePlot data={[posTrace]} layout={{ ...barLayoutBase, yaxis: { ...barLayoutBase.yaxis, tickfont: { size: 11, color: '#34d399' } } }} />
          }
        </ChartCard>
        <ChartCard title="TOP NEGATIVE THEMES">
          {themes.negative.length === 0
            ? <div className="banner info" style={{ margin: 16 }}>No negative themes detected.</div>
            : <SpacePlot data={[negTrace]} layout={{ ...barLayoutBase, yaxis: { ...barLayoutBase.yaxis, tickfont: { size: 11, color: '#fb7185' } } }} />
          }
        </ChartCard>
      </div>

      {/* Top articles */}
      <hr className="divider" />
      <div className="section-header">Most Positive Headlines</div>
      <ArticleTable rows={articles?.positive} emptyMsg="No positive articles found." />

      <hr className="divider" />
      <div className="section-header">Most Negative Headlines</div>
      <ArticleTable rows={articles?.negative} emptyMsg="No negative articles found." />
    </div>
  )
}
