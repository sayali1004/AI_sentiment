import { useState, useEffect, lazy, Suspense } from 'react'
import Stars from './Stars.jsx'
import Sidebar from './components/Sidebar.jsx'

const About             = lazy(() => import('./tabs/About.jsx'))
const Worldwide         = lazy(() => import('./tabs/Worldwide.jsx'))
const US                = lazy(() => import('./tabs/US.jsx'))
const SuperBowl         = lazy(() => import('./tabs/SuperBowl.jsx'))
const DataCenters       = lazy(() => import('./tabs/DataCenters.jsx'))
const CompanyComparison = lazy(() => import('./tabs/CompanyComparison.jsx'))
const TopicDeepDive     = lazy(() => import('./tabs/TopicDeepDive.jsx'))
const SWOT              = lazy(() => import('./tabs/SWOT.jsx'))
const Chat              = lazy(() => import('./tabs/Chat.jsx'))

const TABS = [
  { id: 'worldwide',  icon: '◎', label: 'Worldwide',          Component: Worldwide,         hasFilters: true },
  { id: 'us',         icon: '⬡', label: 'US',                 Component: US,                hasFilters: true },
  { id: 'superbowl',  icon: '◈', label: 'Super Bowl',         Component: SuperBowl,         hasFilters: false },
  { id: 'datacenters',icon: '⊕', label: 'Data Centers',       Component: DataCenters,       hasFilters: true },
  { id: 'comparison', icon: '⊞', label: 'Company Comparison', Component: CompanyComparison, hasFilters: true },
  { id: 'deepdive',   icon: '⊗', label: 'State Comparison',    Component: TopicDeepDive,     hasFilters: true },
  { id: 'swot',       icon: '◇', label: 'SWOT',               Component: SWOT,              hasFilters: true },
  { id: 'chat',       icon: '⟡', label: 'Ask the Data',       Component: Chat,              hasFilters: false },
  { id: 'about',      icon: '✦', label: 'About',              Component: About,             hasFilters: false },
]

const IS_DEV = import.meta.env.DEV
const BACKEND = IS_DEV ? '' : 'https://ai-sentiment-bli0.onrender.com'

function getDefaultDates() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 30)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  }
}

function TabFallback() {
  return (
    <div className="loader-wrap">
      <div className="orbit-loader" />
      <div className="loader-text">LOADING...</div>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('worldwide')
  // Track which tabs have been visited so we only mount them once
  const [mounted, setMounted] = useState(() => new Set(['worldwide']))
  const [filters, setFilters] = useState({
    ...getDefaultDates(),
    selectedOrgs: ['anthropic', 'openai', 'google'],
  })

  useEffect(() => {
    fetch(`${BACKEND}/api/health`).catch(() => {})
  }, [])

  const handleTabClick = (id) => {
    setActiveTab(id)
    setMounted(prev => new Set([...prev, id]))
  }

  return (
    <>
      <Stars />
      <div className="app-shell">
        <Sidebar filters={filters} onFiltersChange={setFilters} />

        <div className="main-content">
          <nav className="tab-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="tab-panel">
            <Suspense fallback={<TabFallback />}>
              {TABS.map(({ id, Component, hasFilters }) =>
                mounted.has(id) ? (
                  <div key={id} style={{ display: activeTab === id ? 'block' : 'none' }}>
                    <Component {...(hasFilters ? { filters } : {})} />
                  </div>
                ) : null
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
