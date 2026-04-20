"""
Backfill embeddings for existing articles that don't have them yet.

Run once from the project root:
    python scripts/backfill_embeddings.py

Uses the service role key to update records.
Skips articles that already have an embedding (safe to re-run).
Progress is printed every batch so you can interrupt and resume.
"""

import json
import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
from config.settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from pipeline.embed import embed_texts, make_embed_text

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

BATCH_SIZE = 200  # articles per round-trip


def backfill() -> None:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    offset = 0
    total = 0

    logger.info("Starting embedding backfill (batch_size=%d)", BATCH_SIZE)

    while True:
        # Fetch next batch of articles without embeddings
        resp = (
            client.table("articles")
            .select("id, title, source_name, organizations")
            .is_("embedding", "null")
            .order("id")
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )

        if not resp.data:
            break

        batch = resp.data
        texts = [
            make_embed_text(r.get("title"), r.get("source_name"), r.get("organizations"))
            for r in batch
        ]

        embeddings = embed_texts(texts, batch_size=256)

        # Serialise vectors as strings: pgvector accepts "[0.1, 0.2, ...]" format
        updates = [
            {"id": batch[i]["id"], "embedding": str(embeddings[i])}
            for i in range(len(batch))
        ]

        client.rpc("batch_update_embeddings", {"updates": updates}).execute()

        total += len(batch)
        offset += BATCH_SIZE
        logger.info("Updated %d articles so far...", total)

    logger.info("Backfill complete — %d articles updated", total)


if __name__ == "__main__":
    backfill()
