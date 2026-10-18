# Session management — requirements

### REQ-001: Session creation
A session is created on successful login (see REQ-004) and identified by an HttpOnly, Secure cookie.

**Acceptance criteria**
- Given a successful login, when the response is inspected, then it sets a cookie with HttpOnly and Secure flags.

### REQ-002: Idle timeout
A session expires after 15 minutes without requests. The next request after expiry redirects to the login page with the message "Your session expired". Extends REQ-001.

**Acceptance criteria**
- Given no requests for 15 minutes, when the user makes a request, then they are redirected to /login?reason=expired.

### REQ-003: Concurrent sessions
A user may have at most 3 active sessions. Opening a 4th terminates the oldest. Extends REQ-001.

**Acceptance criteria**
- Given 3 active sessions, when the user logs in on a 4th device, then the oldest session's next request is redirected to login.

### REQ-004: Login
Covered in the Login spec; included here for reference only.

**Acceptance criteria**
- See Login spec.

### REQ-005: Keep me signed in
Sessions remain valid for 24 hours regardless of activity, so users are never logged out during a working day. Extends REQ-001.

**Acceptance criteria**
- Given a session created at 09:00, when the user makes a request at 17:00 after 6 idle hours, then the request succeeds without re-login.
