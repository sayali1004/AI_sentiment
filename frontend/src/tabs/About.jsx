import jetPhoto from '../assets/linkedin.jpeg'
import sayaliPhoto from '../assets/cropped-CAP01560.JPG'

const GOALS = [
  { icon: '📡', title: 'Track AI Sentiment',        body: 'Monitor how global media coverage of AI shifts over time across countries, companies, and themes.' },
  { icon: '⚡', title: 'Surface Patterns Early',    body: 'Identify geographic and temporal signals like spikes, drops, and regional divergence before they become mainstream narratives.' },
  { icon: '💬', title: 'Natural Language Queries',  body: 'Ask questions in plain English about the data instead of writing SQL or interpreting raw charts.' },
]

const FEATURES = [
  { icon: '🌍', title: 'World Heatmap',   body: 'Country-based sentiment map with date range filter' },
  { icon: '🇺🇸', title: 'US State Map',   body: 'State-level breakdown of AI news sentiment' },
  { icon: '📈', title: 'Trend Analysis',  body: 'Daily sentiment and volume timeseries by company' },
  { icon: '💬', title: 'RAG Chatbot',     body: 'Ask questions and get answers grounded in real data' },
]

const USE_CASES = [
  ['Investors',   'Monitor AI sentiment shifts as a signal for sector exposure'],
  ['Analysts',    'Compare coverage of AI companies across regions and time'],
  ['Journalists', 'Spot emerging narratives in AI news before they peak'],
  ['Researchers', 'Study how public media frames AI risk, progress, and policy'],
  ['Students',    'Explore real-world data engineering and NLP pipelines'],
]

const STACK = [
  ['News Data',   'GDELT Project via Google BigQuery'],
  ['Pipeline',    'Python · pandas · GitHub Actions (daily cron)'],
  ['Database',    'Supabase (PostgreSQL + pgvector)'],
  ['Embeddings',  'all-MiniLM-L6-v2 (384-dim, sentence-transformers)'],
  ['LLM',         'Llama 3.3 70B / 3.1 8B via Groq API'],
  ['Dashboard',   'React · Vite · Plotly.js · FastAPI'],
]

const TEAM = [
  {
    name: 'Jet van Genuchten', photo: jetPhoto,
    github: 'https://github.com/HenriettePlane', handle: '@HenriettePlane',
    bio: "Over the past 9 years, I've led product teams at companies like Weight Watchers, Enter, and Zenjob, consistently shipping features that move the needle. At Weight Watchers, I pioneered the company's first A/B testing program in 60 years and launched product changes that increased subscription revenue by 1%. At Enter, I designed and launched a digital marketplace using no-code tools for rapid iteration, then strategically scaled with production code. At Zenjob, I automated a weeks-long manual contract process down to 10 minutes, boosting conversion from signup to contract by 33%. I'm drawn to the intersection of data infrastructure and user experience. Whether that's wrangling fragmented nutrition datasets into a unified global database, optimizing matching algorithms for gig workers, or building cross-device identity graphs for ad-tech platforms, I believe the best products are built on solid data foundations and ruthless workflow automation.",
  },
  {
    name: 'Sayali Shelke', photo: sayaliPhoto,
    github: 'https://github.com/sayali1004', handle: '@sayali1004',
    bio: "Data Scientist and Analyst with a passion for building tools that make complex data accessible and actionable. Particularly interested in the intersection of AI and media, and how data can be used to understand public narratives around emerging technologies.",
  },
]

export default function About() {
  return (
    <div className="about-root">

      {/* ── Hero ── */}
      <div className="about-hero">
        <div className="about-hero-eyebrow">✦ Observatory</div>
        <div className="about-hero-title">AI Sentiment Observatory</div>
        <div className="about-hero-sub">Tracking how the world feels about AI — one headline at a time.</div>
        <div className="about-hero-orbs" aria-hidden>
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>
      </div>

      {/* ── Why / What ── */}
      <div className="about-why-what">
        <div className="about-big-card">
          <div className="about-big-label">Why</div>
          <div className="about-big-body">
            Researchers and investors in AI lack a clear, up-to-date view of how attitudes are shifting in global media.
            <br /><br />
            <span className="about-highlight">Geographical or temporal patterns</span> — like a regulatory crackdown or a breakthrough generating good press — are difficult to identify with current techniques.
          </div>
        </div>
        <div className="about-big-card about-big-card--alt">
          <div className="about-big-label">What</div>
          <div className="about-big-body">
            An open-source dashboard that visualises <span className="about-highlight">global news sentiment about AI</span> using data from the{' '}
            <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer" className="about-link">GDELT Project</a> — one of the largest open databases of world news events.
            <br /><br />
            It combines GDELT's tone scores with a <span className="about-highlight">RAG-powered chatbot</span> for natural language queries directly over the data.
          </div>
        </div>
      </div>

      {/* ── Goals ── */}
      <div className="about-section-title">Goals &amp; Objectives</div>
      <div className="about-grid-3">
        {GOALS.map(g => (
          <div key={g.title} className="about-card about-card--glow">
            <div className="about-card-icon">{g.icon}</div>
            <div className="about-card-title">{g.title}</div>
            <div className="about-card-body">{g.body}</div>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <div className="about-section-title">Key Features</div>
      <div className="about-grid-4">
        {FEATURES.map(f => (
          <div key={f.title} className="about-card about-card--feature">
            <div className="about-card-icon">{f.icon}</div>
            <div className="about-card-title">{f.title}</div>
            <div className="about-card-body">{f.body}</div>
          </div>
        ))}
      </div>

      {/* ── Use Cases ── */}
      <div className="about-section-title">Use Cases</div>
      <div className="about-use-grid">
        {USE_CASES.map(([who, how]) => (
          <div key={who} className="about-use-card">
            <div className="about-use-who">{who}</div>
            <div className="about-use-how">{how}</div>
          </div>
        ))}
      </div>

      {/* ── Tech Stack ── */}
      <div className="about-section-title">Tech Stack</div>
      <div className="about-stack-grid">
        {STACK.map(([layer, tech]) => (
          <div key={layer} className="about-stack-card">
            <div className="about-stack-layer">{layer}</div>
            <div className="about-stack-tech">{tech}</div>
          </div>
        ))}
      </div>

      {/* ── Team ── */}
      <div className="about-section-title">Team</div>
      <div className="about-grid-2">
        {TEAM.map(m => (
          <div key={m.name} className="team-card">
            <div className="team-avatar">
              <img src={m.photo} alt={m.name} className="team-avatar-img" />
            </div>
            <div className="team-name">{m.name}</div>
            <a className="team-github" href={m.github} target="_blank" rel="noreferrer">{m.handle} →</a>
            <div className="team-bio">{m.bio}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
