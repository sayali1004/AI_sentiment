-- =============================================================
-- pgvector setup for AI Sentiment RAG chatbot
-- Run this once in the Supabase SQL Editor (after setup_supabase.sql)
-- =============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column (384-dim — matches all-MiniLM-L6-v2)
ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 3. HNSW index for fast cosine similarity search
--    Build after backfill so it indexes all existing rows efficiently.
CREATE INDEX IF NOT EXISTS articles_embedding_hnsw
    ON articles USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 4. RPC: semantic similarity search with optional filters
CREATE OR REPLACE FUNCTION match_articles(
    query_embedding   vector(384),
    match_count       int     DEFAULT 30,
    filter_start_date DATE    DEFAULT NULL,
    filter_end_date   DATE    DEFAULT NULL,
    filter_country    TEXT    DEFAULT NULL,
    filter_org        TEXT    DEFAULT NULL
)
RETURNS TABLE (
    title                   TEXT,
    source_name             TEXT,
    published_date          DATE,
    avg_tone                DOUBLE PRECISION,
    mentioned_country_code  CHAR(2),
    organizations           TEXT[],
    similarity              FLOAT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        a.title,
        a.source_name,
        a.published_date,
        a.avg_tone,
        a.mentioned_country_code,
        a.organizations,
        1 - (a.embedding <=> query_embedding) AS similarity
    FROM articles a
    WHERE a.embedding IS NOT NULL
      AND (filter_start_date IS NULL OR a.published_date >= filter_start_date)
      AND (filter_end_date   IS NULL OR a.published_date <= filter_end_date)
      AND (filter_country    IS NULL OR TRIM(a.mentioned_country_code) = filter_country)
      AND (filter_org        IS NULL OR a.organizations @> ARRAY[filter_org])
    ORDER BY a.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 5. RPC: batch update embeddings (used by backfill script)
--    Accepts: [{"id": 123, "embedding": "[0.1, 0.2, ...]"}, ...]
CREATE OR REPLACE FUNCTION batch_update_embeddings(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE articles a
    SET embedding = (u->>'embedding')::vector
    FROM jsonb_array_elements(updates) AS u
    WHERE a.id = (u->>'id')::bigint;
END;
$$;
