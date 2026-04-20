# RAG Chatbot — Architecture & Flow

## 1. Full System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA PIPELINE                            │
│                                                                 │
│  GDELT BigQuery  →  Extract  →  Transform  →  Embed  →  Load   │
│  (global news)      (Python)    (clean data)  (MiniLM)  (upsert)│
└──────────────────────────────────┬──────────────────────────────┘
                                   │ runs daily via GitHub Actions
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE (PostgreSQL)                    │
│                                                                 │
│  articles table:                                                │
│  • title, source, date, avg_tone                                │
│  • country_code, organizations                                  │
│  • embedding vector(384)  ◄── pgvector                          │
│                                                                 │
│  RPC functions:                                                 │
│  • get_sentiment_by_country     • get_sentiment_timeseries      │
│  • get_sentiment_by_org         • match_articles (vector search)│
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RAG CHATBOT (Streamlit)                     │
│                                                                 │
│   User Question  →  Llama 3.3 70B (Groq)  →  Answer            │
│                         │                                       │
│                    picks tools                                  │
│                    ┌────┴─────┐                                 │
│               Analytics   Semantic                              │
│               (SQL RPCs)  (pgvector)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Chatbot Question Flow

```
                        User types a question
                               │
                               ▼
                ┌──────────────────────────┐
                │   Llama 3.3 70B (Groq)   │
                │   reads question +        │
                │   decides which tool(s)   │
                │   to call                 │
                └──────────┬───────────────┘
                           │
          ┌────────────────┼──────────────────┐
          ▼                ▼                  ▼
  "What is the     "Why is sentiment    "Which companies
   sentiment in     negative in the US?"  have best coverage?"
   the US?"               │                  │
          │               │                  │
          ▼               ▼                  ▼
  get_sentiment_    semantic_search_    get_sentiment_
  by_country()      articles()          by_org()
  [SQL RPC]         [pgvector search]   [SQL RPC]
          │               │                  │
          └───────────────┴──────────────────┘
                          │
                          ▼
              Tool results returned to LLM
              (real numbers + relevant headlines)
                          │
                          ▼
                ┌─────────────────────┐
                │  LLM synthesizes    │
                │  a grounded answer  │
                │  from the data      │
                └─────────────────────┘
                          │
                          ▼
                  Answer shown in chat
```

---

## 3. Two Types of Questions

| Question Type | Example | Tool Used | How it works |
|---|---|---|---|
| **Analytical** | "What is US sentiment this month?" | SQL RPC | Aggregates avg_tone + article count from DB |
| **Analytical** | "Which companies have best coverage?" | SQL RPC | Groups articles by org tag, averages tone |
| **Analytical** | "Has sentiment improved this week?" | SQL RPC | Returns daily timeseries |
| **Semantic** | "Why is sentiment negative?" | pgvector | Embeds question → finds similar headlines → LLM reads them |
| **Semantic** | "Summarize the AI narrative" | pgvector | Finds topically relevant articles by meaning |
| **Multi-step** | "Why did sentiment drop and who was involved?" | Both | Chains SQL + vector search |

---

## 4. What Makes This RAG

**Without RAG** (old approach):
> Filter articles by date/country → return recent headlines

**With RAG** (new approach):
> Embed the user's question → find semantically similar articles → pass as context to LLM → grounded answer

```
User: "What concerns are journalists raising about AI safety?"
         │
         ▼
  Embed question → [0.12, -0.34, 0.87, ...]   (384 numbers)
         │
         ▼
  pgvector finds closest article embeddings in Supabase
  (articles about AI regulation, safety risks, ethics debates)
         │
         ▼
  LLM reads those headlines and synthesizes an answer
  grounded in actual news — not hallucinated
```

---

## 5. Tech Stack Slide

| Layer | Technology |
|---|---|
| News Data Source | GDELT Project (Google BigQuery) |
| Data Pipeline | Python (pandas) + GitHub Actions |
| Database | Supabase (PostgreSQL) |
| Vector Search | pgvector (HNSW index, cosine similarity) |
| Embedding Model | all-MiniLM-L6-v2 (384 dimensions) |
| LLM | Llama 3.3 70B via Groq API |
| Dashboard + Chat | Streamlit + Plotly |
| Hosting | Streamlit Community Cloud |
