import { useState, useRef, useEffect } from 'react'
import { postChat } from '../api.js'

const SUGGESTIONS = [
  'What is the sentiment toward AI in the US this month?',
  'Which countries are most negative about AI recently?',
  'Why did AI sentiment drop last week?',
  'Compare Anthropic vs OpenAI sentiment in the last 30 days',
  'Summarize the main AI narrative in global news over the last 30 days',
]

function Thinking() {
  return (
    <div className="thinking">
      <span /><span /><span />
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const send = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text.trim() }
    const history = messages.filter(m => m.role === 'user' || m.role === 'assistant')
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const { reply } = await postChat(userMsg.content, history)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
    setMessages(prev => prev.length > 20 ? prev.slice(-20) : prev)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="chat-wrap">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ fontSize: 22 }}>Ask the Data</div>
        <div className="page-subtitle" style={{ marginTop: 4 }}>Natural language queries powered by Groq + RAG</div>
      </div>

      {/* Input — top, prominent */}
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          placeholder="Ask about AI sentiment trends…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="chat-suggestions">
          <div className="chat-suggestions-label">Try asking</div>
          <div className="suggestions-grid">
            {SUGGESTIONS.map(s => (
              <button key={s} className="suggestion-btn" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.role}`}>
            <div className={`chat-avatar ${m.role}`}>
              {m.role === 'user' ? '◎' : '✦'}
            </div>
            <div className={`chat-bubble ${m.role}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="chat-avatar assistant">✦</div>
            <div className="chat-bubble assistant"><Thinking /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length > 0 && (
        <button className="chat-clear-btn" onClick={() => setMessages([])}>
          Clear conversation
        </button>
      )}
    </div>
  )
}
