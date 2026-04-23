from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


PROJECT_ROOT = Path(__file__).resolve().parents[4]  # .../FINAL PROJECT
MITRE_DATA_DIR = PROJECT_ROOT / "src" / "backend" / "app" / "mitre_data"
IN_FILE = MITRE_DATA_DIR / "enterprise-attack.json"
OUT_FILE = MITRE_DATA_DIR / "mitre_index.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, obj: Any) -> None:
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


def _external_id(stix_obj: Dict[str, Any], source_name: str = "mitre-attack") -> Optional[str]:
    for ref in stix_obj.get("external_references", []) or []:
        if ref.get("source_name") == source_name and ref.get("external_id"):
            return ref["external_id"]
    return None


def build_index(bundle: Dict[str, Any]) -> Dict[str, Any]:
    objects: List[Dict[str, Any]] = bundle.get("objects", []) or []

    # 1) Build tactic shortname -> human name mapping
    # tactic objects look like: type="x-mitre-tactic", x_mitre_shortname="credential-access", name="Credential Access"
    tactic_map: Dict[str, str] = {}
    for o in objects:
        if o.get("type") == "x-mitre-tactic":
            short = o.get("x_mitre_shortname")
            name = o.get("name")
            if short and name:
                tactic_map[str(short)] = str(name)

    # 2) Extract techniques (attack-pattern)
    # technique objects: type="attack-pattern", external_id like T1110 or T1110.001
    techniques: Dict[str, Any] = {}
    for o in objects:
        if o.get("type") != "attack-pattern":
            continue

        tid = _external_id(o, "mitre-attack")
        if not tid:
            continue

        name = o.get("name", "")
        is_sub = bool(o.get("x_mitre_is_subtechnique", False))
        revoked = bool(o.get("revoked", False))
        deprecated = bool(o.get("x_mitre_deprecated", False))
        if revoked or deprecated:
            # keep it simple: skip revoked/deprecated items
            continue

        # tactics from kill_chain_phases (phase_name matches x_mitre_shortname)
        tactic_shortnames = []
        for kcp in o.get("kill_chain_phases", []) or []:
            if kcp.get("kill_chain_name") == "mitre-attack" and kcp.get("phase_name"):
                tactic_shortnames.append(str(kcp["phase_name"]))

        tactic_names = []
        for s in tactic_shortnames:
            tactic_names.append(tactic_map.get(s, s))  # fallback to shortname if not found

        parent = None
        if is_sub and "." in tid:
            parent = tid.split(".", 1)[0]

        techniques[tid] = {
            "id": tid,
            "name": name,
            "tactics": sorted(list(set(tactic_names))),
            "tactic_shortnames": sorted(list(set(tactic_shortnames))),
            "is_subtechnique": is_sub,
            "parent": parent,
        }

    # 3) Provide a list of tactics in display order (based on ATT&CK matrix ordering if available is complex;
    #    we'll use a reasonable fixed order if present)
    # We'll just output all tactic_map entries sorted by name for now; UI can order later.
    tactics_list = [{"shortname": k, "name": v} for k, v in sorted(tactic_map.items(), key=lambda kv: kv[1])]

    return {
        "generated_at": _utc_iso(),
        "source": "mitre-attack/attack-stix-data enterprise-attack.json",
        "tactics": tactics_list,
        "techniques": techniques,
        "stats": {
            "tactic_count": len(tactics_list),
            "technique_count": len(techniques),
        },
    }


def main() -> None:
    if not IN_FILE.exists():
        raise SystemExit(f"MITRE input file not found: {IN_FILE}")

    bundle = _read_json(IN_FILE)
    idx = build_index(bundle)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    _write_json(OUT_FILE, idx)

    print(f"Wrote MITRE index: {OUT_FILE}")
    print(f"Tactics: {idx['stats']['tactic_count']}, Techniques: {idx['stats']['technique_count']}")


if __name__ == "__main__":
    main()
