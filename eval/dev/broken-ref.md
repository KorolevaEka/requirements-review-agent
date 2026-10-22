# Document upload — requirements

### REQ-001: Upload from the client portal
A client uploads PDF, JPG or PNG files up to 25 MB each from the Documents tab. Other types are rejected with "Unsupported file type".

**Acceptance criteria**
- Given a 10 MB PDF, when uploaded, then it appears in the folder within 5 seconds.
- Given a 30 MB PDF, when uploaded, then the error "File is larger than 25 MB" is shown and nothing is stored.
- Given a .exe file, when uploaded, then "Unsupported file type" is shown.

### REQ-002: Virus scan
Every uploaded file is scanned before it becomes visible to team members. Infected files are quarantined and the client sees "This file failed a security check". Extends REQ-001.

**Acceptance criteria**
- Given the EICAR test file, when uploaded, then it is not visible to team members and the client sees the security-check message.

### REQ-003: Team notification
When a scan passes (REQ-002), the assigned team member gets an in-app notification per the notification preferences defined in REQ-009.

**Acceptance criteria**
- Given a clean upload to a client assigned to member M, when the scan finishes, then M receives the notification "New document from <client>" within 1 minute.
