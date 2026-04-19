"""Local sentence embeddings using sentence-transformers (free, no API key)."""

import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer
    logger.info("Loading embedding model %s", MODEL_NAME)
    return SentenceTransformer(MODEL_NAME)


def make_embed_text(
    title: str | None,
    source_name: str | None,
    organizations: list[str] | None,
) -> str:
    """Combine article fields into a single string for embedding."""
    parts = [title or "", source_name or ""]
    if organizations:
        parts.extend(organizations)
    return " ".join(p for p in parts if p).strip()


def embed_texts(texts: list[str], batch_size: int = 256) -> list[list[float]]:
    """Encode texts into 384-dim float vectors, normalised for cosine similarity."""
    embeddings = _model().encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 200,
        normalize_embeddings=True,
    )
    return embeddings.tolist()
