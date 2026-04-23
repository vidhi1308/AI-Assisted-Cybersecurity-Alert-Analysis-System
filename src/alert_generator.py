"""
alert_generator.py

Single-file, dependency-light generator that:
- Loads a Sentinel analytic-rule YAML (path or YAML string)
- Extracts common metadata (id/name/description/query/etc.)
- Produces one randomized sample alert dict for that rule
- Keeps global uniqueness of emails/IPs when you pass a shared RandomAlertState

Usage:
    from alert_generator import RandomAlertState, sentinel_yaml_to_random_alert_json

    state = RandomAlertState(seed=42)
    alert = sentinel_yaml_to_random_alert_json("vendor/imAuthBruteForce.yaml", state=state, as_json=False)
"""

from __future__ import annotations

import json
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union

import yaml  # pip install pyyaml


# ----------------------
# small helpers
# ----------------------
def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _get(doc: Dict[str, Any], *keys: str, default=None):
    """
    Try top-level keys and also under 'properties' commonly used in Sentinel YAMLs.
    """
    for k in keys:
        if k in doc:
            return doc[k]
    props = doc.get("properties")
    if isinstance(props, dict):
        for k in keys:
            if k in props:
                return props[k]
    return default


# ----------------------
# Random state (unique)
# ----------------------
@dataclass
class RandomAlertState:
    """
    Hold this object and reuse across calls to guarantee:
      - unique emails across generated alerts
      - unique IPs across generated alerts
    """
    seed: Optional[int] = None
    used_emails: Set[str] = field(default_factory=set)
    used_ips: Set[str] = field(default_factory=set)

    def __post_init__(self):
        self.rng = random.Random(self.seed)

    # small name/domain pools to generate realistic-looking emails
    FIRSTS = [
        "alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi", "ivan", "judy",
        "mallory", "nancy", "oscar", "peggy", "trent", "victor", "wendy", "quinn", "riley",
        "sam", "taylor", "casey", "jordan", "morgan", "parker", "devon", "blake", "cameron",
    ]
    LASTS = [
        "ng", "patel", "kim", "garcia", "smith", "johnson", "lee", "chen", "martinez",
        "brown", "wilson", "anderson", "thomas", "taylor", "moore", "jackson", "white",
        "harris", "clark", "lewis",
    ]
    DOMAINS = [
        "contoso.com", "fabrikam.com", "northwindtraders.com", "adatum.com", "wingtiptoys.com",
        "tailspintoys.com", "litware.com", "proseware.com", "blueyonderairlines.com",
        "wideworldimporters.com",
    ]
    VENDORS = [
        "Microsoft/AzureAD", "Okta/SSO", "PingIdentity/SSO", "Cisco/Duo", "Google/Workspace",
        "AWS/IAM", "JumpCloud/Directory", "Microsoft/Defender",
    ]
    USER_TYPES = ["Interactive", "ServicePrincipal", "ManagedIdentity"]

    def unique_email(self) -> str:
        for _ in range(50_000):
            email = f"{self.rng.choice(self.FIRSTS)}.{self.rng.choice(self.LASTS)}{self.rng.randint(1,9999)}@{self.rng.choice(self.DOMAINS)}"
            if email not in self.used_emails:
                self.used_emails.add(email)
                return email
        raise RuntimeError("Failed to generate unique email")

    @staticmethod
    def _is_reserved_or_private(a: int, b: int, c: int) -> bool:
        # avoid private/reserved ranges for "public-looking" IPs
        if a == 10:
            return True
        if a == 172 and 16 <= b <= 31:
            return True
        if a == 192 and b == 168:
            return True
        if a == 127:
            return True
        if a == 169 and b == 254:
            return True
        if a == 0:
            return True
        if 224 <= a <= 255:
            return True
        if a == 100 and 64 <= b <= 127:
            return True
        if a == 198 and b in (18, 19):
            return True
        # avoid the RFC 5737 documentation ranges to keep variety
        if (a, b, c) in ((192, 0, 2), (198, 51, 100), (203, 0, 113)):
            return True
        return False

    def unique_public_ip(self) -> str:
        for _ in range(200_000):
            a = self.rng.randint(1, 223)
            b = self.rng.randint(0, 255)
            c = self.rng.randint(0, 255)
            d = self.rng.randint(1, 254)
            if self._is_reserved_or_private(a, b, c):
                continue
            ip = f"{a}.{b}.{c}.{d}"
            if ip not in self.used_ips:
                self.used_ips.add(ip)
                return ip
        raise RuntimeError("Failed to generate unique IP")

    def unique_ip_list(self, count: int) -> List[str]:
        return [self.unique_public_ip() for _ in range(count)]

    def random_counts(self) -> (int, int):
        failures = self.rng.randint(8, 120)
        successes = 1 if self.rng.random() < 0.75 else self.rng.randint(0, 3)
        return failures, successes

    def random_reported_by(self) -> str:
        return self.rng.choice(self.VENDORS)

    def random_user_type(self) -> str:
        return self.rng.choice(self.USER_TYPES)


# ----------------------
# core conversion function
# ----------------------
def sentinel_yaml_to_random_alert_dict(
    yaml_input: Union[str, Path, Dict[str, Any]],
    *,
    state: Optional[RandomAlertState] = None,
    alert_time: Optional[datetime] = None,
    window_minutes_range: (int, int) = (10, 90),
    ip_count_range: (int, int) = (1, 5),
) -> Dict[str, Any]:
    """
    Return a Python dict representing a randomized alert for the supplied YAML rule.
    - yaml_input can be: Path to file, YAML text string, or already-parsed dict.
    - Pass in a shared `state` (RandomAlertState) to avoid duplicates across calls.
    """
    state = state or RandomAlertState()
    # Load YAML
    if isinstance(yaml_input, dict):
        doc = yaml_input
    else:
        p = Path(yaml_input)
        if p.exists():
            doc = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
        else:
            # treat value as YAML content string
            doc = yaml.safe_load(str(yaml_input)) or {}

    # Extract common rule metadata
    rule_id = _get(doc, "id", "ruleId", "analyticRuleId") or str(uuid.uuid4())
    rule_name = _get(doc, "name", "displayName", "ruleName") or Path(str(rule_id)).stem or "Unnamed Sentinel Analytic Rule"
    description = _get(doc, "description", default="") or ""
    severity = _get(doc, "severity", default="Medium") or "Medium"
    tactics = _get(doc, "tactics", default=[]) or []
    techniques = _get(doc, "relevantTechniques", "techniques", default=[]) or []
    query = _get(doc, "query", default="") or ""
    query_frequency = _get(doc, "queryFrequency", default="PT1H") or "PT1H"
    query_period = _get(doc, "queryPeriod", default="PT1H") or "PT1H"
    trigger_operator = _get(doc, "triggerOperator", default="GreaterThan") or "GreaterThan"
    trigger_threshold = _get(doc, "triggerThreshold", default=0)
    kind = _get(doc, "kind", default="Scheduled") or "Scheduled"
    version = _get(doc, "version", "ruleVersion", default=None)

    # Randomized values
    compromised_entity = state.unique_email()
    ip_count = state.rng.randint(ip_count_range[0], ip_count_range[1])
    ips = state.unique_ip_list(ip_count)
    failure_count, success_count = state.random_counts()
    reported_by = state.random_reported_by()
    user_type = state.random_user_type()

    now = (alert_time or _utc_now()).astimezone(timezone.utc)
    window_minutes = state.rng.randint(window_minutes_range[0], window_minutes_range[1])
    start = now - timedelta(minutes=window_minutes)
    end = now

    # name/upn
    if "@" in compromised_entity:
        acct_name, upn_suffix = compromised_entity.split("@", 1)
    else:
        acct_name, upn_suffix = compromised_entity, ""

    alert = {
        "schemaVersion": "1.0",
        "alertType": "MicrosoftSentinelAnalyticRule",
        "ruleId": rule_id,
        "ruleName": rule_name,
        **({"ruleVersion": version} if version is not None else {}),
        "kind": kind,
        "severity": severity,
        "description": description,
        "tactics": tactics,
        "techniques": techniques,
        "queryFrequency": query_frequency,
        "queryPeriod": query_period,
        "triggerOperator": trigger_operator,
        "triggerThreshold": trigger_threshold,
        "query": query,
        # alert metadata
        "alertId": str(uuid.uuid4()),
        "timeGeneratedUtc": _iso_z(now),
        "startTimeUtc": _iso_z(start),
        "endTimeUtc": _iso_z(end),
        "compromisedEntity": compromised_entity,
        "entities": [
            {
                "kind": "Account",
                "type": "Account",
                "fullName": compromised_entity,
                "name": acct_name,
                "upnSuffix": upn_suffix,
            }
        ],
        "customDetails": {
            "IpAddresses": ", ".join(ips),
            "ReportedBy": reported_by,
            "FailureCount": failure_count,
            "SuccessCount": success_count,
            "TargetUserId": str(uuid.uuid4()),
            "TargetUsername": compromised_entity,
            "TargetUserType": user_type,
            "StartTime": _iso_z(start),
            "EndTime": _iso_z(end),
        },
        "extendedProperties": {
            "source": "Sentinel GitHub Analytic Rule YAML",
            "tags": [],
        },
    }

    return alert


# ----------------------
# Public wrapper used by backend code (names must match imports)
# ----------------------
def sentinel_yaml_to_random_alert_json(
    yaml_input: Union[str, Path, Dict[str, Any]],
    *,
    state: Optional[RandomAlertState] = None,
    as_json: bool = True,
    json_indent: int = 2,
) -> Union[str, Dict[str, Any]]:
    """
    Wrapper that returns JSON string by default (as earlier code expected).
    Pass as_json=False to get a dict.
    """
    d = sentinel_yaml_to_random_alert_dict(yaml_input, state=state)
    if as_json:
        return json.dumps(d, indent=json_indent, ensure_ascii=False)
    return d
