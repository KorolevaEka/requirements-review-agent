# Password reset

### REQ-001: Request a link
An unauthenticated user submits an email address. The service always displays "Check your inbox" to avoid exposing account existence.

**Acceptance criteria**
- Given an existing account, when its email is submitted, then a reset email is queued and "Check your inbox" is displayed.
- Given an unknown email, when it is submitted, then no email is queued and the same message is displayed.

### REQ-002: Expire the link
A reset link expires 15 minutes after creation and can be used once.

**Acceptance criteria**
- Given a link aged 15 minutes, when opened, then the service returns HTTP 410.
- Given a successfully used link, when opened again, then the service returns HTTP 410.
