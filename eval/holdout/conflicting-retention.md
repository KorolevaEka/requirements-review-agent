# Audit log retention

### REQ-101: Retention policy
For every workspace, audit log entries must be permanently deleted exactly 30 days after creation.

**Acceptance criteria**
- Given an entry aged exactly 30 days, when retention runs, then it is permanently removed and cannot be retrieved by the audit API.

### REQ-102: Minimum retention
For every workspace, all audit log entries must remain retrievable through the audit API for at least 90 days after creation, including entries governed by REQ-101.

**Acceptance criteria**
- Given an entry aged 60 days, when an owner requests it through the audit API, then the API returns HTTP 200 with that entry.
