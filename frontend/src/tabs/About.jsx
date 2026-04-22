export default function About() {
  return (
    <div>
      {/* Hero */}
      <div className="about-hero">
        <div className="about-hero-title">AI Sentiment Observatory</div>
        <div className="about-hero-sub">
          Tracking how the world feels about AI — one headline at a time.
        </div>
      </div>

      <hr className="divider" />

      {/* Why / What */}
      <div className="about-grid-2" style={{ marginBottom: 28 }}>
        <div className="about-card">
          <div className="about-card-title">◎ Why</div>
          <div className="about-card-body">
            Investors, analysts, and researchers with a stake in the AI industry
            lack a clear, real-time view of how global media sentiment toward AI is shifting.
            <br /><br />
            Existing tools don't make it easy to spot <strong style={{ color: '#a5b4fc' }}>geographic
            or temporal patterns</strong> that could signal inflection points — like the "AI bubble"
            deflating, a regulatory crackdown, or a breakthrough driving positive coverage.
          </div>
        </div>
        <div className="about-card">
          <div className="about-card-title">⊕ What</div>
          <div className="about-card-body">
            An open-source web dashboard that visualises <strong style={{ color: '#a5b4fc' }}>global
            news sentiment about AI</strong> using data from the{' '}
            <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer"
               style={{ color: '#818cf8' }}>GDELT Project</a> — one of the largest open databases
            of world news events.
            <br /><br />
            It combines GDELT's built-in tone scores with a <strong style={{ color: '#a5b4fc' }}>RAG-powered
            chatbot</strong> that lets you ask natural language questions directly about the data.
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* Goals */}
      <div className="section-header">Goals &amp; Objectives</div>
      <div className="about-grid-3">
        {[
          {
            icon: '📡',
            title: 'Track AI Sentiment',
            body: 'Monitor how global media coverage of AI shifts over time across countries, companies, and themes.',
          },
          {
            icon: '⚡',
            title: 'Surface Patterns Early',
            body: 'Identify geographic and temporal signals — spikes, drops, regional divergence — before they become mainstream narratives.',
          },
          {
            icon: '💬',
            title: 'Enable Natural Language Queries',
            body: "Let users ask plain-English questions about the data instead of writing SQL or interpreting raw charts.",
          },
        ].map(g => (
          <div key={g.title} className="about-card">
            <div className="about-card-icon">{g.icon}</div>
            <div className="about-card-title">{g.title}</div>
            <div className="about-card-body">{g.body}</div>
          </div>
        ))}
      </div>

      <hr className="divider" />

      {/* Key features */}
      <div className="section-header">Key Features</div>
      <div className="about-grid-4">
        {[
          { icon: '🌍', title: 'World Heatmap', body: 'Country-level sentiment map with date range filter' },
          { icon: '🇺🇸', title: 'US State Map', body: 'State-level breakdown of AI news sentiment' },
          { icon: '📈', title: 'Trend Analysis', body: 'Daily sentiment and volume timeseries by company' },
          { icon: '💬', title: 'RAG Chatbot', body: 'Ask questions — answered with real data from the DB' },
        ].map(f => (
          <div key={f.title} className="about-card">
            <div className="about-card-icon">{f.icon}</div>
            <div className="about-card-title">{f.title}</div>
            <div className="about-card-body">{f.body}</div>
          </div>
        ))}
      </div>

      <hr className="divider" />

      {/* Use cases */}
      <div className="section-header">Use Cases</div>
      <table className="use-table" style={{ marginBottom: 28 }}>
        <thead>
          <tr>
            <th>Who</th>
            <th>How they use it</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Investors', 'Monitor AI sentiment shifts as a signal for sector exposure'],
            ['Analysts', 'Compare coverage of AI companies across regions and time'],
            ['Journalists', 'Spot emerging narratives in AI news before they peak'],
            ['Researchers', 'Study how public media frames AI risk, progress, and policy'],
            ['Students', 'Explore real-world data engineering and NLP pipelines'],
          ].map(([who, how]) => (
            <tr key={who}>
              <td>{who}</td>
              <td>{how}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="divider" />

      {/* Tech stack */}
      <div className="section-header">Tech Stack</div>
      <table className="tech-table" style={{ marginBottom: 28 }}>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Technology</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['News Data', 'GDELT Project via Google BigQuery'],
            ['Pipeline', 'Python · pandas · GitHub Actions (daily cron)'],
            ['Database', 'Supabase (PostgreSQL + pgvector)'],
            ['Embeddings', 'all-MiniLM-L6-v2 (384-dim, sentence-transformers)'],
            ['LLM', 'Llama 3.3 70B / 3.1 8B via Groq API'],
            ['Dashboard', 'React · Vite · Plotly.js · FastAPI'],
          ].map(([layer, tech]) => (
            <tr key={layer}>
              <td>{layer}</td>
              <td>{tech}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="divider" />

      {/* Team */}
      <div className="section-header">Team</div>
      <div className="about-grid-2">
        {[
          {
            name: 'Jet Van Genuchten',
            github: 'https://github.com/HenriettePlane',
            handle: '@HenriettePlane',
          },
          {
            name: 'Sayali Shelke',
            github: 'https://github.com/sayali1004',
            handle: '@sayali1004',
          },
        ].map(m => (
          <div key={m.name} className="team-card">
            <div className="team-avatar">✦</div>
            <div className="team-name">{m.name}</div>
            <a className="team-github" href={m.github} target="_blank" rel="noreferrer">
              {m.handle} →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
