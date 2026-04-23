# Detection-Specific SOC Playbook Context

This document provides SOC-focused context for common identity, API, and credential-based security alerts.

---

## 1. MFA Disable / Authentication Configuration Change

### Description
Disabling Multi-Factor Authentication (MFA) or modifying authentication methods significantly weakens account security and may indicate account takeover or privilege abuse.

### Risk
- Unauthorized access to sensitive systems
- Privilege escalation
- Persistence by adversary

### Investigation Steps
- Identify the affected user account (e.g., username/email)
- Review recent authentication logs and sign-in patterns
- Check for concurrent logins from unusual locations or IP addresses
- Validate whether the change was approved or part of a legitimate admin action

### Recommended Actions
- Re-enable MFA for the affected account immediately
- Reset credentials and revoke active sessions
- Investigate source IP addresses involved in the change
- Escalate to identity/security team if unauthorized

---

## 2. Suspicious Login / Anomalous Sign-in

### Description
A login event that deviates from normal user behavior, such as unusual geolocation, time, or device.

### Risk
- Credential compromise
- Account takeover
- Lateral movement

### Investigation Steps
- Analyze source IP and geolocation
- Compare login with user’s historical behavior
- Check for multiple failed login attempts
- Verify device fingerprint and user agent

### Recommended Actions
- Investigate the user associated with the login
- Validate legitimacy with the user directly if necessary
- Reset credentials if compromise is suspected
- Block or monitor suspicious IP addresses

---

## 3. API Abuse / Malicious API Access

### Description
Unusual or high-frequency API requests that may indicate abuse, credential leakage, or automation by an attacker.

### Risk
- Data exfiltration
- Service abuse
- Unauthorized access

### Investigation Steps
- Identify API endpoint and request patterns
- Analyze request frequency and anomalies
- Check authentication tokens used
- Review IP addresses making API calls

### Recommended Actions
- Revoke or rotate API keys/tokens
- Rate-limit or block suspicious traffic
- Investigate associated user or service account
- Enable additional monitoring on affected APIs

---

## 4. Credential Access / Brute Force / Password Attacks

### Description
Multiple failed authentication attempts or abnormal login attempts indicating brute force or credential stuffing.

### Risk
- Account compromise
- Unauthorized access
- Privilege escalation

### Investigation Steps
- Count failed login attempts
- Identify targeted accounts
- Analyze IP sources of attempts
- Check for password spraying patterns

### Recommended Actions
- Lock or monitor targeted accounts
- Enforce stronger password policies
- Enable or enforce MFA
- Block malicious IP addresses

---

## 5. General SOC Response Guidelines

### Always Perform
- Validate alert authenticity
- Determine scope of impact
- Collect relevant logs and telemetry
- Contain affected accounts/devices
- Eradicate root cause
- Document actions taken
- Escalate when needed

### Entity Awareness
When generating playbooks:
- Always reference the exact username if available
- Always reference the exact source IP if available
- Always reference the affected host if available