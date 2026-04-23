---
kb_type: ir_lifecycle
version: 1.0
scope: "Define IR stage transitions and response escalation thresholds."
---

# Incident Response Lifecycle Boundaries

## Objective
Prevent premature escalation and overreaction while maintaining structured IR flow.

---

# Stage 1: Detection & Analysis

Default stage for ALL alerts.

Required actions:
- Validate signal
- Scope entity impact
- Collect additional telemetry
- Determine confidence level

No destructive containment here unless evidence is strong.

---

# Stage 2: Containment

Enter only if:
- Corroborated malicious behavior
- Privileged account risk
- Active threat behavior
- Policy violation with impact

Containment must:
- Be proportional
- Prefer reversible actions first

Examples:
- Revoke sessions
- Reset MFA
- Block IP temporarily

Avoid:
- Broad environment-wide actions without approval

---

# Stage 3: Eradication

Only if confirmed compromise.

Requires:
- Artifact identification
- Root cause hypothesis

---

# Stage 4: Recovery

Validate:
- MFA re-enabled
- Roles restored correctly
- Logs monitored for recurrence

---

# Stage 5: Post-Incident

Recommend:
- Detection tuning
- Policy reinforcement
- Logging improvements
- Control hardening

---

# Confidence-Based Escalation Model

Low Confidence:
→ Monitor + gather logs

Medium Confidence:
→ Reversible containment

High Confidence:
→ Strong containment + escalate

Confidence must be explicitly declared.
