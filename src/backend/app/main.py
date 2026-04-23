from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

import json
import re
from datetime import datetime, timezone

from .db.database import Base, engine, SessionLocal
from .db.models import Alert as AlertModel
from .db.models import Playbook as PlaybookModel
from collections import Counter, defaultdict
from .mitre.loader import load_mitre_index, technique_meta

from .schemas.alert import (
    AlertIngestRequest,
    AlertIngestResponse,
    NormalizedAlert,
)

from .schemas.playbook import PlaybookJSON, PlaybookRecord
from .llm.ollama_client import ollama_generate_json

# RAG retriever (uses kb_index.json)
from .rag.retriever import retrieve as rag_retrieve

# legacy imports
import traceback
try:
    from src.backend.alert_service import AlertService
except Exception:
    AlertService = None

try:
    from src.backend.detection_loader import load_detections
except Exception:
    load_detections = None

app = FastAPI(title="SOC AI Triage (merged)", version="0.5.1")

# Create DB tables (MVP)
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Basic health endpoint
@app.get("/health")
def health():
    return {"status": "ok"}

# ---------- Alerts storage / ingest endpoints (SQLite) ----------
@app.post("/alerts/ingest", response_model=AlertIngestResponse)
def ingest_alerts(payload: AlertIngestRequest, db: Session = Depends(get_db)):
    ids = []
    for alert in payload.alerts:
        ids.append(alert.alert_id)
        existing = db.query(AlertModel).filter(AlertModel.alert_id == alert.alert_id).first()
        if existing:
            existing.title = alert.title
            existing.timestamp = alert.timestamp
            existing.severity = alert.severity
            existing.normalized = alert.model_dump(mode="json")
        else:
            db_alert = AlertModel(
                alert_id=alert.alert_id,
                title=alert.title,
                timestamp=alert.timestamp,
                severity=alert.severity,
                normalized=alert.model_dump(mode="json"),
            )
            db.add(db_alert)
    db.commit()
    return AlertIngestResponse(ingested=len(payload.alerts), alert_ids=ids)

@app.get("/alerts", response_model=List[NormalizedAlert])
def list_alerts(db: Session = Depends(get_db)):
    rows = db.query(AlertModel).order_by(AlertModel.timestamp.desc()).limit(200).all()
    return [NormalizedAlert(**r.normalized) for r in rows]

@app.get("/alerts/{alert_id}", response_model=NormalizedAlert)
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    row = db.query(AlertModel).filter(AlertModel.alert_id == alert_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    return NormalizedAlert(**row.normalized)

# ---------- Legacy detection endpoints (wrap your alert trainer) ----------
PROJECT_ROOT = Path(__file__).resolve().parents[3]
VENDOR_DIR = PROJECT_ROOT / "vendor"

alert_service = None
alert_service_error = None

if AlertService is not None:
    try:
        try:
            alert_service = AlertService(VENDOR_DIR, seed=42)
        except TypeError:
            alert_service = AlertService(str(VENDOR_DIR), seed=42)
    except Exception as e:
        alert_service = None
        alert_service_error = f"Init failed: {e}\n{traceback.format_exc()}"
else:
    alert_service_error = "AlertService import failed (AlertService is None)"

@app.get("/detections")
def get_detections():
    try:
        if load_detections is not None:
            detections = load_detections(VENDOR_DIR)
        elif alert_service is not None and hasattr(alert_service, "list_detections"):
            detections = alert_service.list_detections()
        else:
            detections = []
        return {"count": len(detections), "vendor_dir": str(VENDOR_DIR), "detections": detections}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list detections: {e}")

@app.post("/detections/{detection_id}/generate-alert")
def generate_alert(detection_id: str):
    try:
        if alert_service is None:
            raise HTTPException(status_code=500, detail=f"AlertService not available: {alert_service_error}")
        alert = alert_service.generate_alert(detection_id)
        return alert
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate alert: {e}")

# --------------------
# Normalizer & generate-and-save endpoint
# --------------------
def normalize_generated_alert(raw_alert: dict) -> NormalizedAlert:
    """
    Map a generated alert dict (from alert_generator) into our NormalizedAlert schema.
    """
    alert_id = raw_alert.get("alertId") or raw_alert.get("id") or raw_alert.get("ruleId") or (
        str(raw_alert.get("ruleName", "")) + "-" + (raw_alert.get("timeGeneratedUtc") or "")
    )
    title = raw_alert.get("ruleName") or raw_alert.get("rule_id") or "Generated Alert"
    timestamp_str = raw_alert.get("timeGeneratedUtc") or raw_alert.get("time") or raw_alert.get("startTimeUtc")

    import dateutil.parser as dp
    if timestamp_str:
        try:
            timestamp = dp.parse(timestamp_str)
        except Exception:
            try:
                timestamp = datetime.fromisoformat(timestamp_str)
            except Exception:
                timestamp = datetime.now(timezone.utc)
    else:
        timestamp = datetime.now(timezone.utc)

    severity = (raw_alert.get("severity") or raw_alert.get("severityText") or "medium").lower()

    src_ip = None
    custom = raw_alert.get("customDetails") or {}
    ip_field = custom.get("IpAddresses") or custom.get("IpAddress") or ""
    if ip_field:
        src_ip = ip_field.split(",")[0].strip()

    username = raw_alert.get("compromisedEntity") or (custom.get("TargetUsername") or custom.get("TargetUser"))
    hostname = raw_alert.get("hostname") or custom.get("Hostname") or None

    log_source = "sentinel"
    rule_source = "sentinel"
    rule_name = raw_alert.get("ruleName") or raw_alert.get("rule_name") or ""

    attributes = {}
    for k in ("FailureCount", "SuccessCount", "ReportedBy", "TargetUserId"):
        if k in custom:
            attributes[k] = custom[k]

    return NormalizedAlert(
        alert_id=str(alert_id),
        title=str(title),
        timestamp=timestamp,
        severity=str(severity),
        src_ip=src_ip,
        username=username,
        hostname=hostname,
        log_source=log_source,
        rule_source=rule_source,
        rule_name=rule_name,
        attributes=attributes,
        raw_event=raw_alert,
    )

@app.post("/detections/{detection_id}/generate-and-save", response_model=NormalizedAlert)
def generate_and_save(detection_id: str, db: Session = Depends(get_db)):
    try:
        if alert_service is None:
            raise HTTPException(status_code=500, detail=f"AlertService not available: {alert_service_error}")

        raw = alert_service.generate_alert(detection_id)
        normalized = normalize_generated_alert(raw)

        existing = db.query(AlertModel).filter(AlertModel.alert_id == normalized.alert_id).first()
        if existing:
            existing.title = normalized.title
            existing.timestamp = normalized.timestamp
            existing.severity = normalized.severity
            existing.normalized = normalized.model_dump(mode="json")
        else:
            db.add(
                AlertModel(
                    alert_id=normalized.alert_id,
                    title=normalized.title,
                    timestamp=normalized.timestamp,
                    severity=normalized.severity,
                    normalized=normalized.model_dump(mode="json"),
                )
            )
        db.commit()
        return normalized

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate-and-save alert: {e}")

# ---------- Playbook helpers ----------
def _extract_json_object(text: str) -> str:
    text = text.strip()
    if text.startswith("{") and text.endswith("}"):
        return text
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        raise ValueError("No JSON object found in model output")
    return m.group(0)

def enforce_entities(playbook_obj: dict, alert: NormalizedAlert) -> dict:
    """
    Light-touch post-processing to ensure entity-specific wording when values are present.
    We avoid heavy rewriting; only replace common vague phrases.
    """
    u = (alert.username or "").strip()
    ip = (alert.src_ip or "").strip()
    host = (alert.hostname or "").strip()

    actions = playbook_obj.get("recommended_actions", [])
    if not isinstance(actions, list):
        return playbook_obj

    for a in actions:
        if not isinstance(a, dict):
            continue
        txt = (a.get("action") or "")
        low = txt.lower()

        # User replacements
        if u and ("the user" in low or "affected user" in low or "target user" in low) and (u not in txt):
            txt = re.sub(r"\bthe affected user\b", f"user {u}", txt, flags=re.IGNORECASE)
            txt = re.sub(r"\baffected user\b", f"user {u}", txt, flags=re.IGNORECASE)
            txt = re.sub(r"\btarget user\b", f"user {u}", txt, flags=re.IGNORECASE)
            txt = re.sub(r"\bthe user\b", f"user {u}", txt, flags=re.IGNORECASE)

        # Host replacements
        if host and ("the host" in low or "affected host" in low) and (host not in txt):
            txt = re.sub(r"\bthe affected host\b", f"host {host}", txt, flags=re.IGNORECASE)
            txt = re.sub(r"\baffected host\b", f"host {host}", txt, flags=re.IGNORECASE)
            txt = re.sub(r"\bthe host\b", f"host {host}", txt, flags=re.IGNORECASE)

        # IP replacements (only if action mentions IP but doesn't specify)
        if ip and ("ip" in low) and (ip not in txt):
            txt = re.sub(r"\bthe source ip\b", f"source IP {ip}", txt, flags=re.IGNORECASE)
            txt = re.sub(r"\bsource ip\b", f"source IP {ip}", txt, flags=re.IGNORECASE)

        a["action"] = txt

    playbook_obj["recommended_actions"] = actions
    return playbook_obj

def build_playbook_prompt(*, alert: NormalizedAlert, raw_event: dict, retrieved_chunks: list) -> str:
    description = (raw_event or {}).get("description", "")
    query = (raw_event or {}).get("query", "")
    tactics = (raw_event or {}).get("tactics", [])
    techniques = (raw_event or {}).get("techniques", [])

    kb_text = "\n\n".join([
        f"[KB{i+1}] ({c.get('source','unknown')} score={c.get('score',0):.2f})\n{(c.get('text','')[:500])}"
        for i, c in enumerate(retrieved_chunks or [])
    ])

    rules = """
You are a SOC (Security Operations Center) incident response assistant.

STRICT RULES:
- Use ONLY the alert facts and provided KB snippets.
- Do NOT invent tools, commands, or indicators not grounded in the alert or KB.
- Output MUST be valid JSON only (no markdown or commentary).

QUALITY REQUIREMENTS:
- Be specific, technical, and operational — avoid generic or textbook advice.
- Write like a real SOC analyst documenting an investigation.
- Prefer concrete actions over high-level suggestions.
- Tie every statement to alert evidence (user, IP, host, process, etc.).

CONTENT REQUIREMENTS:

1. WHAT_HAPPENED:
- Provide a concise but information-dense explanation of the alert.
- Explain WHAT occurred and HOW it was detected.
- If the detection contains jargon (e.g., "privileged account", "encoded command", "lateral movement"),
  include a brief inline explanation of that term.
- Example: "Privileged account credentials changed (accounts with elevated administrative permissions)..."

2. ASSOCIATED_RISK:
- Explain WHY this alert matters from a security perspective.
- Describe potential attacker intent and impact (e.g., persistence, lateral movement, privilege escalation).
- Use a professional SOC tone (not generic risk statements).
- Tie risk to MITRE techniques if available.

3. RECOMMENDED_ACTIONS:
- Provide 4 to 5 high-quality SOC response steps (not 8 generic ones).
- Actions must be:
  - actionable
  - specific to the alert context
  - ordered logically (triage → validation → containment → investigation)
- Include:
  - validation steps (is this a false positive?)
  - investigation steps (logs, process tree, network activity)
  - containment steps (isolate host, disable user, block IP if justified)
- Avoid generic steps like "monitor the situation" unless justified.

4. EVIDENCE FOCUS:
- When suggesting actions, explicitly reference:
  - username
  - hostname
  - source IP
  (if available)

5. NO FLUFF:
- Do NOT repeat the alert.
- Do NOT provide vague recommendations.
- Do NOT include unnecessary explanations outside the required sections.

ENTITY REQUIREMENTS:
- You MUST use the exact values under ENTITY VALUES when referring to entities.
- If username is present, write it explicitly (e.g., "Investigate user <username>").
- If src_ip is present, write it explicitly (e.g., "Investigate source IP <src_ip>").
- If hostname is present, write it explicitly (e.g., "Isolate host <hostname>").
- Do NOT write vague phrases like "the user" or "the host" when values are available.
"""

    schema = """
Return ONLY this JSON object with exactly these fields:
{
  "what_happened": "string",
  "associated_risk": "string",
  "recommended_actions": [
    {"action":"string","reason":"string","priority":"high|medium|low"}
  ]
}
"""

    prompt = f"""{rules}

{schema}

ENTITY VALUES (use these exact strings):
- username: {alert.username}
- src_ip: {alert.src_ip}
- hostname: {alert.hostname}

ALERT (normalized):
- title: {alert.title}
- severity: {alert.severity}
- timestamp: {alert.timestamp}
- rule_name: {alert.rule_name}
- attributes: {alert.attributes}

DETECTION CONTEXT (from alert raw_event):
- description: {description}
- query: {query}
- tactics: {tactics}
- techniques: {techniques}

KNOWLEDGE BASE SNIPPETS (may be empty):
{kb_text}

Now produce the JSON playbook.
"""
    return prompt

def _confidence_from_sources(sources: list) -> str:
    if not sources:
        return "low"

    real_sources = [s for s in sources if s.get("source") != "kb/fallback"]
    if not real_sources:
        return "low"

    scores = [float(s.get("score", 0.0)) for s in real_sources]
    if not scores:
        return "low"

    avg = sum(scores) / len(scores)

    if avg >= 0.65:
        return "high"
    if avg >= 0.50:
        return "medium"
    return "low"

# ---------- Playbook endpoints ----------
@app.post("/alerts/{alert_id}/generate-playbook", response_model=PlaybookRecord)
def generate_playbook(alert_id: str, db: Session = Depends(get_db)):
    row = db.query(AlertModel).filter(AlertModel.alert_id == alert_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert = NormalizedAlert(**row.normalized)
    raw_event = row.normalized.get("raw_event") or {}

    # Build RAG query terms
    description = (raw_event or {}).get("description", "")
    query = (raw_event or {}).get("query", "")
    tactics = (raw_event or {}).get("tactics", [])
    techniques = (raw_event or {}).get("techniques", [])

    query_terms = " ".join(filter(None, [
        alert.title,
        alert.rule_name,
        description,
        query,
        " ".join(tactics) if isinstance(tactics, list) else str(tactics),
        " ".join(techniques) if isinstance(techniques, list) else str(techniques),
    ]))

    retrieved = rag_retrieve(query_terms, top_k=2, min_score=0.50)

    if not retrieved:
        retrieved = [{
            "id": -1,
            "source": "kb/fallback",
            "text": "Generic SOC triage: validate the alert, determine scope, collect relevant logs, contain affected accounts/devices, eradicate cause, recover, document findings, and escalate when needed.",
            "score": 0.0
        }]

    model_name = "llama3.1:8b"
    prompt = build_playbook_prompt(alert=alert, raw_event=raw_event, retrieved_chunks=retrieved)
    llm_text = ollama_generate_json(model=model_name, prompt=prompt)

    try:
        json_str = _extract_json_object(llm_text)
        obj = json.loads(json_str)

        # enforce entity-specific wording (safe post-processing)
        obj = enforce_entities(obj, alert)

        playbook = PlaybookJSON(**obj)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {e}")

    confidence = _confidence_from_sources(retrieved)

    existing = db.query(PlaybookModel).filter(PlaybookModel.alert_id == alert_id).first()
    now = datetime.now(timezone.utc)

    if existing:
        existing.model = model_name
        existing.playbook_json = playbook.model_dump()
        existing.raw_llm_output = llm_text
        existing.sources = retrieved
        existing.confidence = confidence
        existing.created_at = now
        db.commit()
        pb = existing
    else:
        pb = PlaybookModel(
            alert_id=alert_id,
            model=model_name,
            playbook_json=playbook.model_dump(),
            raw_llm_output=llm_text,
            sources=retrieved,
            confidence=confidence,
            created_at=now,
        )
        db.add(pb)
        db.commit()
        db.refresh(pb)

    return PlaybookRecord(
        playbook_id=pb.playbook_id,
        alert_id=pb.alert_id,
        created_at=pb.created_at,
        model=pb.model,
        playbook=PlaybookJSON(**pb.playbook_json),
        sources=pb.sources or [],
        confidence=pb.confidence,
    )

@app.get("/alerts/{alert_id}/playbook", response_model=PlaybookRecord)
def get_playbook_for_alert(alert_id: str, db: Session = Depends(get_db)):
    pb = db.query(PlaybookModel).filter(PlaybookModel.alert_id == alert_id).first()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return PlaybookRecord(
        playbook_id=pb.playbook_id,
        alert_id=pb.alert_id,
        created_at=pb.created_at,
        model=pb.model,
        playbook=PlaybookJSON(**pb.playbook_json),
        sources=pb.sources or [],
        confidence=pb.confidence,
    )

@app.get("/playbooks", response_model=List[PlaybookRecord])
def list_playbooks(db: Session = Depends(get_db)):
    rows = db.query(PlaybookModel).order_by(PlaybookModel.created_at.desc()).limit(200).all()
    out = []
    for pb in rows:
        out.append(
            PlaybookRecord(
                playbook_id=pb.playbook_id,
                alert_id=pb.alert_id,
                created_at=pb.created_at,
                model=pb.model,
                playbook=PlaybookJSON(**pb.playbook_json),
                sources=pb.sources or [],
                confidence=pb.confidence,
            )
        )
    return out
# --------------------------
# MITRE coverage (PLAYBOOK-DRIVEN)
# --------------------------

def _extract_technique_ids(raw_event: dict) -> List[str]:
    """
    Extract technique IDs from raw_event safely.
    Expected: ["T1110", "T1556", "T1110.001"] etc.
    """
    if not raw_event:
        return []

    techs = raw_event.get("techniques") or raw_event.get("relevantTechniques") or []
    out: List[str] = []

    if isinstance(techs, list):
        for t in techs:
            if isinstance(t, str):
                t = t.strip()
                if t:
                    out.append(t)
    elif isinstance(techs, str):
        # handle comma-separated strings
        for part in techs.split(","):
            part = part.strip()
            if part:
                out.append(part)

    # normalize duplicates
    return sorted(list(set(out)))


def _coverage_level(count: int) -> str:
    if count >= 3:
        return "high"
    if count == 2:
        return "medium"
    if count == 1:
        return "low"
    return "none"


@app.get("/mitre/coverage")
def mitre_coverage(db: Session = Depends(get_db)):
    """
    Evidence-based MITRE coverage:
    Only counts techniques for alerts that have a playbook.
    """
    # Load MITRE index for totals / naming
    idx = load_mitre_index()
    total_techniques = int(idx.get("stats", {}).get("technique_count", len(idx.get("techniques", {}))))

    # Get all playbooks -> alert_ids
    playbooks = db.query(PlaybookModel).order_by(PlaybookModel.created_at.desc()).all()
    playbook_alert_ids = [pb.alert_id for pb in playbooks if pb.alert_id]

    # Fetch alerts for those playbooks
    alerts = db.query(AlertModel).filter(AlertModel.alert_id.in_(playbook_alert_ids)).all()

    technique_counts = Counter()
    tactic_counts = Counter()

    # Optional: keep mapping tactic -> set(techniques) for heatmap use
    tactic_to_techniques = defaultdict(set)

    for a in alerts:
        normalized = a.normalized or {}
        raw_event = normalized.get("raw_event") or {}

        tech_ids = _extract_technique_ids(raw_event)
        for tid in tech_ids:
            technique_counts[tid] += 1
            meta = technique_meta(tid)
            for tactic_name in meta.get("tactics", []) or []:
                tactic_counts[tactic_name] += 1
                tactic_to_techniques[tactic_name].add(tid)

    covered_techniques = len(technique_counts)
    coverage_pct = (covered_techniques / total_techniques * 100.0) if total_techniques else 0.0

    return {
        "based_on": "playbooks",
        "playbook_count": len(playbooks),
        "alert_count_used": len(alerts),
        "totals": {
            "covered_techniques": covered_techniques,
            "total_techniques": total_techniques,
            "coverage_pct": round(coverage_pct, 2),
        },
        "tactics": dict(tactic_counts),
        "techniques": dict(technique_counts),
    }


@app.get("/mitre/heatmap")
def mitre_heatmap(db: Session = Depends(get_db)):
    """
    Returns ALL tactics and ALL techniques.
    Count is based only on alerts that have playbooks.
    """

    idx = load_mitre_index()
    techniques_index = idx.get("techniques", {})

    playbooks = db.query(PlaybookModel).all()
    playbook_alert_ids = [pb.alert_id for pb in playbooks if pb.alert_id]
    alerts = db.query(AlertModel).filter(AlertModel.alert_id.in_(playbook_alert_ids)).all()

    technique_counts = Counter()

    # Count technique usage from playbook-backed alerts
    for a in alerts:
        normalized = a.normalized or {}
        raw_event = normalized.get("raw_event") or {}
        tech_ids = _extract_technique_ids(raw_event)
        for tid in tech_ids:
            technique_counts[tid] += 1

    # Build tactic grouping including ALL techniques
    tactic_map = defaultdict(list)

    for tid, meta in techniques_index.items():
        name = meta.get("name", tid)
        tactics = meta.get("tactics", []) or ["Unmapped"]
        count = technique_counts.get(tid, 0)

        tile = {
            "technique_id": tid,
            "technique_name": name,
            "count": count,
        }

        for tactic_name in tactics:
            tactic_map[tactic_name].append(tile)

    # Sort techniques alphabetically
    tactics_out = []
    for tactic_name, tiles in tactic_map.items():
        tiles_sorted = sorted(tiles, key=lambda x: x["technique_id"])
        tactics_out.append({
            "tactic": tactic_name,
            "tiles": tiles_sorted
        })

    tactics_out.sort(key=lambda x: x["tactic"].lower())

    total_techniques = len(techniques_index)
    covered_techniques = sum(1 for c in technique_counts.values() if c > 0)
    coverage_pct = (covered_techniques / total_techniques * 100.0) if total_techniques else 0.0

    return {
        "based_on": "playbooks",
        "totals": {
            "covered_techniques": covered_techniques,
            "total_techniques": total_techniques,
            "coverage_pct": round(coverage_pct, 2),
        },
        "tactics": tactics_out,
    }