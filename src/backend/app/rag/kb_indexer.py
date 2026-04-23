import json
from pathlib import Path
from typing import List
from sentence_transformers import SentenceTransformer
import numpy as np
from tqdm import tqdm

# Project root = 3 levels up from this file (app/rag/)
PROJECT_ROOT = Path(__file__).resolve().parents[4]
KB_DIR = PROJECT_ROOT / "kb"
INDEX_FILE = Path(__file__).resolve().parent / "kb_index.json"
EMBED_MODEL = "all-MiniLM-L6-v2"

def chunk_text(text: str, max_chars: int = 800) -> List[str]:
    text = text.strip()
    if len(text) <= max_chars:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        slice_ = text[start:end]
        split = slice_.rfind("\n")
        if split <= 0:
            split = max(slice_.rfind(". "), slice_.rfind("! "), slice_.rfind("? "), 0)
        if split <= 0:
            split = end
        chunks.append(text[start:start+split].strip())
        start = start + split
    return [c for c in chunks if c]

def build_index():
    print(f"Indexing KB from: {KB_DIR}")
    model = SentenceTransformer(EMBED_MODEL)

    items = []
    for p in sorted(KB_DIR.rglob("*.md")) + sorted(KB_DIR.rglob("*.txt")):
        try:
            text = p.read_text(encoding="utf-8")
        except Exception:
            continue
        chunks = chunk_text(text, max_chars=800)
        for c in chunks:
            items.append({
                "source": str(p.relative_to(KB_DIR)),
                "text": c,
            })

    texts = [it["text"] for it in items]
    embeddings = []

    for i in tqdm(range(0, len(texts), 64), desc="Embedding"):
        batch = texts[i:i+64]
        emb = model.encode(batch, show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)
        for e in emb:
            embeddings.append(e.tolist())

    out = []
    for i, it in enumerate(items):
        out.append({
            "id": i,
            "source": it["source"],
            "text": it["text"],
            "embedding": embeddings[i],
        })

    INDEX_FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} chunks to {INDEX_FILE}")

if __name__ == "__main__":
    build_index()
