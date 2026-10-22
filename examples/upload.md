# Attachment upload — intentionally flawed

### REQ-001: Size limit
An authenticated user may upload attachments of at most 10 MB.

**Acceptance criteria**
- Given an 11 MB file, when uploaded, then the service returns HTTP 413.

### REQ-002: Another size limit
Uploads larger than 5 MB must be rejected, including those allowed by REQ-001.

**Acceptance criteria**
- Given a 7 MB file, when uploaded, then the service returns HTTP 413.

### REQ-003: Upload speed
Uploads should finish quickly.
