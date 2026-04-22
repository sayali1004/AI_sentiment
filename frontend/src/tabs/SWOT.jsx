import { useState } from 'react'
import { postSWOT } from '../api.js'

const ORGS = [
  'anthropic', 'openai', 'google', 'microsoft', 'meta',
  'nvidia', 'amazon', 'apple', 'xai', 'mistral',
  'deepseek', 'anduril', 'palantir', 'department_of_defense',
]

function formatOrg(o) {
  return o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const QUAD = [
  {
    key: 'strengths',
    label: 'Strengths',
    icon: '▲',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.07)',
    border: 'rgba(52,211,153,0.25)',
  },
  {
    key: 'weaknesses',
    label: 'Weaknesses',
    icon: '▼',
    color: '#fb7185',
    bg: 'rgba(251,113,133,0.07)',
    border: 'rgba(251,113,133,0.25)',
  },
  {
    key: 'opportunities',
    label: 'Opportunities',
    icon: '◈',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.07)',
    border: 'rgba(56,189,248,0.25)',
  },
  {
    key: 'threats',
    label: 'Threats',
    icon: '⚠',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.25)',
  },
]

export default function SWOT({ filters = {} }) {
  const { startDate, endDate } = filters
  const [org, setOrg] = useState('openai')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generate = async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await postSWOT(org, startDate, endDate)
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">SWOT Analysis</div>
        <div className="page-subtitle">AI-generated from live news sentiment · {startDate} → {endDate}</div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>Company</label>
        <select
          value={org}
          onChange={e => { setOrg(e.target.value); setResult(null) }}
          style={{
            background: 'var(--space-mid)',
            border: '1px solid var(--glass-border)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            padding: '6px 12px',
            fontSize: 13,
            fontFamily: 'Space Grotesk, sans-serif',
            cursor: 'pointer',
          }}
        >
          {ORGS.map(o => <option key={o} value={o}>{formatOrg(o)}</option>)}
        </select>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            background: loading ? 'var(--space-mid)' : 'var(--stellar-dim)',
            border: '1px solid var(--stellar)',
            borderRadius: 8,
            color: loading ? 'var(--text-muted)' : 'var(--text-primary)',
            padding: '6px 20px',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'Space Grotesk, sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.04em',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Analysing…' : 'Generate SWOT'}
        </button>
      </div>

      {error && <div className="banner error" style={{ marginBottom: 24 }}>Error: {error}</div>}

      {loading && (
        <div className="loader-wrap">
          <div className="orbit-loader" />
          <div className="loader-text">GENERATING SWOT FOR {formatOrg(org).toUpperCase()}…</div>
        </div>
      )}

      {result && (
        <>
          <div style={{
            textAlign: 'center',
            marginBottom: 20,
            color: 'var(--text-secondary)',
            fontSize: 13,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {formatOrg(org)} · {startDate} → {endDate}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}>
            {QUAD.map(q => (
              <div key={q.key} style={{
                background: q.bg,
                border: `1px solid ${q.border}`,
                borderRadius: 12,
                padding: '20px 24px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}>
                  <span style={{ color: q.color, fontSize: 16 }}>{q.icon}</span>
                  <span style={{
                    color: q.color,
                    fontFamily: 'Space Mono, monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
                    {q.label}
                  </span>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(result[q.key] || []).map((point, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: q.color, fontSize: 10, marginTop: 5, flexShrink: 0 }}>◆</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.55 }}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 20,
            padding: '10px 16px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 8,
            color: 'var(--text-muted)',
            fontSize: 11,
            letterSpacing: '0.04em',
          }}>
            Generated by Groq LLaMA from GDELT news data · {startDate} to {endDate} · Refresh to regenerate
          </div>
        </>
      )}

      {!result && !loading && !error && (
        <div className="coming-soon">
          <div className="coming-soon-icon">◈</div>
          <div className="coming-soon-title">Select a company and generate</div>
          <div className="coming-soon-body">
            The SWOT is built from real news headlines and sentiment scores using LLaMA.
            It reflects what the media is actually saying — not a generic template.
          </div>
        </div>
      )}
    </div>
  )
}
