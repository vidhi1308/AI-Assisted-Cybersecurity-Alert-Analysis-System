from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime

Priority = Literal["high", "medium", "low"]

class RecommendedAction(BaseModel):
    action: str
    reason: str
    priority: Priority = "medium"

class PlaybookJSON(BaseModel):
    what_happened: str = Field(..., description="Summary of what happened based on alert + context")
    associated_risk: str = Field(..., description="Risk/impact if this is true positive")
    recommended_actions: List[RecommendedAction] = Field(..., description="Ordered list of actions")

class PlaybookRecord(BaseModel):
    playbook_id: str
    alert_id: str
    created_at: datetime
    model: str
    playbook: PlaybookJSON
    sources: List[Dict[str, Any]] = []
    confidence: str = "medium"
