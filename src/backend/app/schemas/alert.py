from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class NormalizedAlert(BaseModel):
    alert_id: str = Field(..., examples=["ALERT-00001"])
    title: str = Field(..., examples=["Multiple Failed Logins"])
    timestamp: datetime
    severity: str = Field(..., examples=["low", "medium", "high", "critical"])

    # Core entities (optional)
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    username: Optional[str] = None
    hostname: Optional[str] = None

    process_name: Optional[str] = None
    command_line: Optional[str] = None
    file_hash_sha256: Optional[str] = None
    url: Optional[str] = None
    domain: Optional[str] = None

    # Metadata about the detection
    log_source: str = Field(..., examples=["windows_security", "edr", "proxy", "cloud"])
    rule_source: str = Field(..., examples=["sigma", "elastic", "custom"])
    rule_name: str

    # Extra structured context and original raw event
    attributes: Dict[str, Any] = Field(default_factory=dict)
    raw_event: Optional[Dict[str, Any]] = None

class AlertIngestRequest(BaseModel):
    alerts: List[NormalizedAlert]

class AlertIngestResponse(BaseModel):
    ingested: int
    alert_ids: List[str]
