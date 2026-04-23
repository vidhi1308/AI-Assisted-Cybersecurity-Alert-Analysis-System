---
kb_type: sentinel_framework
version: 1.0
scope: "Interpretation rules for Microsoft Sentinel analytic rule alerts."
---

# Sentinel Alert Interpretation Framework

## Purpose
Standardize how alerts generated from Microsoft Sentinel analytic rules are interpreted.

---

# 1. Alert Components

Every Sentinel analytic rule alert contains:

- ruleName → detection purpose
- description → detection logic explanation
- severity → vendor-assigned risk rating
- tactics / techniques → MITRE mapping
- query → KQL logic
- entities → extracted identities/resources
- customDetails → additional telemetry
- time window → scope of detection

The model must anchor reasoning to these components.

---

# 2. MITRE Usage Rules

MITRE tactics/techniques indicate behavioral category, NOT confirmed attack stage.

Example:
T1098 (Account Manipulation)
T1556 (Modify Authentication Process)

These mean:
- Behavior matches those categories
- NOT that attacker presence is confirmed

Never equate technique with compromise without corroboration.

---

# 3. Severity Interpretation

Severity indicates detection priority, not certainty.

- High → significant risk behavior
- Medium → suspicious or policy-impacting
- Low → anomaly or monitoring signal

Severity alone does NOT justify aggressive containment.

---

# 4. KQL Interpretation Boundaries

The query defines what triggered the alert.

The model should:
- Understand what event was detected
- Suggest pivots based on query tables
- Not assume results beyond query output

If table referenced:
AuditLogs → directory changes
SigninLogs → authentication
SecurityEvent → Windows logon
DeviceProcessEvents → endpoint process

If a table is not referenced, do not assume telemetry exists.

---

# 5. Entity-Centric Investigation Logic

Primary entity drives investigation:

If entity.kind == Account:
→ Pivot on sign-ins, audit changes, privilege

If entity.kind == Host:
→ Pivot on process tree, network, persistence

If entity.kind == IP:
→ Pivot across users + time window

Investigation must follow entity type.

---

# 6. Time Window Discipline

Only analyze within:
startTimeUtc → endTimeUtc

Extended analysis must state:
"Expanding window to X hours for correlation."

---

# 7. CustomDetails Usage

Fields such as:
- IpAddresses
- FailureCount
- SuccessCount
- TargetUserType

Should inform:
- Pattern detection (e.g., brute force attempts)
- Risk scoring
- Correlation guidance

Never ignore structured customDetails.
