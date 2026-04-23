import json
from pathlib import Path
from typing import List, Dict, Any
import numpy as np
from numpy.linalg import norm
from sentence_transformers import SentenceTransformer

INDEX_FILE = Path(__file__).resolve().parent / "kb_index.json"
EMBED_MODEL = "all-MiniLM-L6-v2"

_model = None
_index = None

def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBED_MODEL)
    return _model

def _load_index():
    global _index
    if _index is None:
        if INDEX_FILE.exists():
            _index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        else:
            _index = []
    return _index

def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (norm(a) * norm(b)))

def retrieve(query: str, top_k: int = 5, min_score: float = 0.45) -> List[Dict[str, Any]]:
    """
    Returns up to top_k KB chunks with cosine similarity >= min_score.
    Each result: {id, source, text, score}
    """
    index = _load_index()
    if not index:
        return []

    model = _get_model()
    q = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]

    scored = []
    for item in index:
        emb = np.array(item["embedding"], dtype=float)
        score = _cosine(q, emb)
        scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)

    out = []
    for score, item in scored[:top_k]:
        if score >= min_score:
            out.append({
                "id": item["id"],
                "source": item["source"],
                "text": item["text"],
                "score": float(score),
            })
    return out
