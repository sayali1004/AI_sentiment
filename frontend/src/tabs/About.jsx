import jetPhoto from '../assets/linkedin.jpeg'
import sayaliPhoto from '../assets/cropped-CAP01560.JPG'

export default function About() {
  return (
    <div>
      {/* Hero */}
      <div className="about-hero">
        <div className="about-hero-title">AI Sentiment Observatory</div>
        <div className="about-hero-sub">
          Tracking how the world feels about AI : one headline at a time.
        </div>
      </div>

      <hr className="divider" />

      {/* Why / What */}
      <div className="about-grid-2" style={{ marginBottom: 28 }}>
        <div className="about-card">
          <div className="about-card-title">◎ Why</div>
          <div className="about-card-body">
            Researchers and Investors with an interest in the AI sector do not have a clear, up-to-date understanding of 
            how attitudes regarding AI are changing throughout the world's media.
            <br /><br />
            <strong style={{ color: '#a5b4fc' }}> Geographical or temporal patterns </strong> that could indicate turning points, 
            such as the "AI bubble" deflating, a regulatory crackdown, or a breakthrough generating good press, are difficult to identify with current techniques.
          </div>
        </div>
        <div className="about-card">
          <div className="about-card-title">⊕ What</div>
          <div className="about-card-body">
            An open-source web dashboard that visualises <strong style={{ color: '#a5b4fc' }}>global
            news sentiment about AI</strong> using data from the{' '}
            <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer"
               style={{ color: '#818cf8' }}>GDELT Project</a>. It's one of the largest open databases
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
            body: 'Identify geographic and temporal signals like spikes, drops, and regional divergence before they become mainstream narratives.',
          },
          {
            icon: '💬',
            title: 'Enable Natural Language Queries',
            body: "It lets users ask questions in plain English about the data instead of writing SQL or interpreting raw charts.",
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
          { icon: '🌍', title: 'World Heatmap', body: 'Country based sentiment map with date range filter' },
          { icon: '🇺🇸', title: 'US State Map', body: 'State based breakdown of AI news sentiment' },
          { icon: '📈', title: 'Trend Analysis', body: 'Daily sentiment and volume timeseries by company' },
          { icon: '💬', title: 'RAG Chatbot', body: 'Ask questions & get answers with real data from the DB' },
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
            name: 'Jet van Genuchten',
            photo: jetPhoto,
            github: 'https://github.com/HenriettePlane',
            handle: '@HenriettePlane',
            bio: "Over the past 9 years, I've led product teams at companies like Weight Watchers, Enter, and Zenjob, consistently shipping features that move the needle. At Weight Watchers, I pioneered the company's first A/B testing program in 60 years and launched product changes that increased subscription revenue by 1%. At Enter, I designed and launched a digital marketplace using no-code tools for rapid iteration, then strategically scaled with production code. At Zenjob, I automated a weeks-long manual contract process down to 10 minutes, boosting conversion from signup to contract by 33%. I'm drawn to the intersection of data infrastructure and user experience. Whether that's wrangling fragmented nutrition datasets into a unified global database, optimizing matching algorithms for gig workers, or building cross-device identity graphs for ad-tech platforms, I believe the best products are built on solid data foundations and ruthless workflow automation.",
          },
          {
            name: 'Sayali Shelke',
            photo: sayaliPhoto,
            github: 'https://github.com/sayali1004',
            handle: '@sayali1004',
            bio: "I'm a Data Scientist and Analyst with a passion for building tools that make complex data accessible and actionable. I have experience working with large datasets, building machine learning models, and developing web applications. I'm particularly interested in the intersection of AI and media, and how we can use data to understand and shape public narratives around emerging technologies. In my free time, I enjoy exploring new programming languages, contributing to open-source projects, and staying up-to-date with the latest developments in AI research."+" I also like cooking and trying out new recipes, and traveling to new places!",
          },
        ].map(m => (
          <div key={m.name} className="team-card">
            <div className="team-avatar">
              <img src={m.photo} alt={m.name} className="team-avatar-img" />
            </div>
            <div className="team-name">{m.name}</div>
            <a className="team-github" href={m.github} target="_blank" rel="noreferrer">
              {m.handle} →
            </a>
            {m.bio && <div className="team-bio">{m.bio}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
