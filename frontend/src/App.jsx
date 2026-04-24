import { useState } from 'react'
import Stars from './Stars.jsx'
import Sidebar from './components/Sidebar.jsx'
import About from './tabs/About.jsx'
import Worldwide from './tabs/Worldwide.jsx'
import US from './tabs/US.jsx'
import SuperBowl from './tabs/SuperBowl.jsx'
import DataCenters from './tabs/DataCenters.jsx'
import CompanyComparison from './tabs/CompanyComparison.jsx'
import TopicDeepDive from './tabs/TopicDeepDive.jsx'
import SWOT from './tabs/SWOT.jsx'
import Chat from './tabs/Chat.jsx'

const TABS = [
  { id: 'about',      icon: '✦', label: 'About' },
  { id: 'worldwide',  icon: '◎', label: 'Worldwide' },
  { id: 'us',         icon: '⬡', label: 'US' },
  { id: 'superbowl',  icon: '◈', label: 'Super Bowl' },
  { id: 'datacenters',icon: '⊕', label: 'Data Centers' },
  { id: 'comparison', icon: '⊞', label: 'Company Comparison' },
  { id: 'deepdive',   icon: '⊗', label: 'Deep Dive' },
  { id: 'swot',       icon: '◇', label: 'SWOT' },
  { id: 'chat',       icon: '⟡', label: 'Ask the Data' },
]

function getDefaultDates() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 30)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('about')
  const [filters, setFilters] = useState({
    ...getDefaultDates(),
    selectedOrgs: ['anthropic', 'openai', 'google'],
  })

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
          {/* Tab navigation */}
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

          {/* Active tab content */}
          <div className="tab-panel">
            {renderTab()}
          </div>
        </div>
      </div>
    </>
  )
}
