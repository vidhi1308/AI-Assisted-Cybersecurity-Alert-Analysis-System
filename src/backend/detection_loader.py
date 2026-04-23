from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import yaml


def load_detections(vendor_dir: Path) -> List[Dict[str, Any]]:
    """
    Reads Sentinel analytic-rule YAML files from vendor_dir and returns a list of
    detection objects your frontend can display.

    detection_id is just the filename (stable and easy).
    """
    detections: List[Dict[str, Any]] = []

    yaml_files = sorted(list(vendor_dir.glob("*.yml")) + list(vendor_dir.glob("*.yaml")))
    for f in yaml_files:
        try:
            doc = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
        except Exception:
            # skip files that fail to parse
            continue

        # Sentinel rules often store fields under `properties`
        props = doc.get("properties") if isinstance(doc.get("properties"), dict) else {}

        detection_id = f.name  # stable id = filename
        name = doc.get("name") or props.get("displayName") or props.get("name") or f.stem
        description = props.get("description") or doc.get("description") or ""
        severity = props.get("severity") or doc.get("severity") or "Unknown"
        tactics = props.get("tactics") or doc.get("tactics") or []
        techniques = props.get("relevantTechniques") or props.get("techniques") or []
        query = props.get("query") or doc.get("query") or ""

        detections.append(
            {
                "id": detection_id,
                "name": name,
                "description": description,
                "severity": severity,
                "tactics": tactics,
                "techniques": techniques,
                "query": query,
                "source_file": str(f),
            }
        )

    return detections
