import { useState, useEffect, lazy, Suspense } from 'react'
import Stars from './Stars.jsx'
import Sidebar from './components/Sidebar.jsx'

const About          = lazy(() => import('./tabs/About.jsx'))
const Worldwide      = lazy(() => import('./tabs/Worldwide.jsx'))
const US             = lazy(() => import('./tabs/US.jsx'))
const SuperBowl      = lazy(() => import('./tabs/SuperBowl.jsx'))
const DataCenters    = lazy(() => import('./tabs/DataCenters.jsx'))
const CompanyComparison = lazy(() => import('./tabs/CompanyComparison.jsx'))
const TopicDeepDive  = lazy(() => import('./tabs/TopicDeepDive.jsx'))
const SWOT           = lazy(() => import('./tabs/SWOT.jsx'))
const Chat           = lazy(() => import('./tabs/Chat.jsx'))

const TABS = [
  { id: 'worldwide',  icon: '◎', label: 'Worldwide' },
  { id: 'us',         icon: '⬡', label: 'US' },
  { id: 'superbowl',  icon: '◈', label: 'Super Bowl' },
  { id: 'datacenters',icon: '⊕', label: 'Data Centers' },
  { id: 'comparison', icon: '⊞', label: 'Company Comparison' },
  { id: 'deepdive',   icon: '⊗', label: 'Deep Dive' },
  { id: 'swot',       icon: '◇', label: 'SWOT' },
  { id: 'chat',       icon: '⟡', label: 'Ask the Data' },
  { id: 'about',      icon: '✦', label: 'About' },
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
  const [filters, setFilters] = useState({
    ...getDefaultDates(),
    selectedOrgs: ['anthropic', 'openai', 'google'],
  })

  // Ping the backend on mount so Render wakes up before the user needs data
  useEffect(() => {
    fetch(`${BACKEND}/api/health`).catch(() => {})
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'about':       return <About />
      case 'worldwide':   return <Worldwide filters={filters} />
      case 'us':          return <US filters={filters} />
      case 'superbowl':   return <SuperBowl />
      case 'datacenters': return <DataCenters filters={filters} />
      case 'comparison':  return <CompanyComparison filters={filters} />
      case 'deepdive':    return <TopicDeepDive filters={filters} />
      case 'swot':        return <SWOT filters={filters} />
      case 'chat':        return <Chat />
      default:            return null
    }
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
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="tab-panel">
            <Suspense fallback={<TabFallback />}>
              {renderTab()}
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
