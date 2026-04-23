from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

# This file lives at: src/backend/app/mitre/loader.py
# We want: src/backend/app/mitre_data/mitre_index.json
MITRE_INDEX_PATH = Path(__file__).resolve().parents[1] / "mitre_data" / "mitre_index.json"


@lru_cache(maxsize=1)
def load_mitre_index() -> Dict[str, Any]:
    if not MITRE_INDEX_PATH.exists():
        raise FileNotFoundError(f"MITRE index not found at: {MITRE_INDEX_PATH}")
    return json.loads(MITRE_INDEX_PATH.read_text(encoding="utf-8"))


def technique_meta(technique_id: str) -> Dict[str, Any]:
    idx = load_mitre_index()
    return idx.get("techniques", {}).get(technique_id, {"id": technique_id, "name": technique_id, "tactics": []})
