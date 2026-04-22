import { useEffect, useState } from 'react'
import { postSWOT } from '../api.js'

const PROJECT_SWOT = {
  strengths: [
    'RAG Architecture: Vector search + LLM intelligence',
    'Real-Time Updates: 350-400 articles/day auto-processing',
    'Zero Cost: $0/month operational cost (free tiers)',
    'High Accuracy: VADER achieves 83% sentiment accuracy',
    'Semantic Search: 384-dim embeddings, <200ms queries',
    'Open Source: Fully reproducible research',
    'Geographic Coverage: 22+ US states tracked',
    'Theme Taxonomy: 49 categories (25 neg, 24 pos)',
    'Fast Response: <3 sec query-to-answer total time',
    'Natural Language: No SQL knowledge required',
  ],
  weaknesses: [
    'Limited Volume: Only 400 US articles/day',
    'Single Source: Relies solely on GDELT data',
    'Title-Only: Sentiment from headlines, not full text',
    'No Custom Training: Off-the-shelf models only',
    'Storage Limits: Free tier caps at 500MB',
    'Binary Sentiment: Doesn\'t capture emotional nuance',
    'No Authentication: Can\'t save user preferences',
    'Free Tier Dependency: No SLA guarantees',
    'Regex Themes: May miss sophisticated patterns',
  ],
  opportunities: [
    'Full-Text Analysis: Expand beyond headlines',
    'Multi-Language: Add Spanish, French, Chinese',
    'Entity Sentiment: Track specific people/companies',
    'Academic Publication: Submit to ACL/EMNLP',
    'Premium API: Monetize with paid tier ($9–49/mo)',
    'B2B Dashboard: Corporate brand monitoring',
    'Mobile App: iOS/Android native apps',
    'Real-Time Alerts: Push notifications for events',
    'Fine-Tuned Models: Custom BERT for news domain',
    'Community Building: GitHub contributors, Discord',
  ],
  threats: [
    'Free Tier Removal: Providers eliminate free plans',
    'GDELT API Changes: Data format or access disrupted',
    'Commercial Giants: Brandwatch, Hootsuite dominate',
    'Model Obsolescence: GPT-5/Claude 4 render old models inferior',
    'Data Privacy Laws: GDPR/CCPA restrict collection',
    'News Bias: GDELT may over-represent certain sources',
    'Security Risks: DDoS attacks, API key exposure',
    'Fake News: Cannot distinguish credible sources',
    'Rate Limit Enforcement: Groq caps at 14,400/day',
    'Maintenance Burden: No dedicated support team',
  ],
}

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

      {/* Project SWOT — static */}
      <div className="section-header" style={{ marginBottom: 16 }}>Project Overview</div>
      <SwotGrid data={PROJECT_SWOT} />

      <hr className="divider" />

      {/* Live SWOT — LLM generated from data */}
      <div className="section-header" style={{ marginBottom: 16 }}>Live Sentiment SWOT · Global AI Industry</div>

      {loading && <Loader />}
      {error && <div className="banner error">Error: {error}</div>}
      {result && <SwotGrid data={result} />}
    </div>
  )
}

function SwotGrid({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
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
            {(data[q.key] || []).map((point, i) => (
              <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ color: q.color, fontSize: 8, marginTop: 6, flexShrink: 0, opacity: 0.8 }}>◆</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6 }}>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
