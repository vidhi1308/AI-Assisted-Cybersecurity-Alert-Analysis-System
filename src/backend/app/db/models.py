from sqlalchemy import Column, String, DateTime, JSON, Text
from datetime import datetime, timezone
import uuid
from src.backend.app.db.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    severity = Column(String, nullable=False)

    normalized = Column(JSON, nullable=False)
from sqlalchemy import Column, String, DateTime, JSON, Text, Index

class Playbook(Base):
    __tablename__ = "playbooks"

    playbook_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    model = Column(String, nullable=False)
    playbook_json = Column(JSON, nullable=False)

    # Optional debug/audit fields
    raw_llm_output = Column(Text, nullable=True)
    sources = Column(JSON, nullable=False, default=list)
    confidence = Column(String, nullable=False, default="medium")

