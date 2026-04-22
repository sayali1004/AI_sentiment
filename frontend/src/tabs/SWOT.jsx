import { useEffect, useState } from 'react'
import { postSWOT } from '../api.js'

const QUAD = [
  {
    key: 'strengths',
    label: 'Strengths',
    icon: '▲',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.07)',
    border: 'rgba(52,211,153,0.25)',
    glow: 'rgba(52,211,153,0.12)',
  },
  {
    key: 'weaknesses',
    label: 'Weaknesses',
    icon: '▼',
    color: '#fb7185',
    bg: 'rgba(251,113,133,0.07)',
    border: 'rgba(251,113,133,0.25)',
    glow: 'rgba(251,113,133,0.12)',
  },
  {
    key: 'opportunities',
    label: 'Opportunities',
    icon: '◈',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.07)',
    border: 'rgba(56,189,248,0.25)',
    glow: 'rgba(56,189,248,0.12)',
  },
  {
    key: 'threats',
    label: 'Threats',
    icon: '⚠',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.25)',
    glow: 'rgba(251,191,36,0.12)',
  },
]

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="orbit-loader" />
      <div className="loader-text">GENERATING SWOT ANALYSIS…</div>
    </div>
  )
}

export default function SWOT({ filters = {} }) {
  const { startDate, endDate } = filters
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!startDate || !endDate) return
    setLoading(true)
    setError(null)
    setResult(null)
    postSWOT('all', startDate, endDate)
      .then(data => {
        if (data.error) setError(data.error)
        else setResult(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [startDate, endDate])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">SWOT Analysis</div>
        <div className="page-subtitle">Global AI Industry · {startDate} → {endDate}</div>
      </div>

      {loading && <Loader />}

      {error && <div className="banner error">Error: {error}</div>}

      {result && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}>
            {QUAD.map(q => (
              <div key={q.key} style={{
                background: q.bg,
                border: `1px solid ${q.border}`,
                borderRadius: 14,
                padding: '22px 26px',
                boxShadow: `0 0 32px ${q.glow}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ color: q.color, fontSize: 18 }}>{q.icon}</span>
                  <span style={{
                    color: q.color,
                    fontFamily: 'Space Mono, monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}>
                    {q.label}
                  </span>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(result[q.key] || []).map((point, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{
                        color: q.color,
                        fontSize: 8,
                        marginTop: 6,
                        flexShrink: 0,
                        opacity: 0.8,
                      }}>◆</span>
                      <span style={{
                        color: 'var(--text-primary)',
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}>
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  )
}
