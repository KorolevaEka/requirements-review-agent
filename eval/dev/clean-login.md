# Login — requirements

### REQ-001: Email and password login
A registered user signs in with email and password. On success the user lands on the dashboard within 2 seconds (p95). On failure the form shows "Invalid email or password" and keeps the email field filled.

**Acceptance criteria**
- Given a registered user with valid credentials, when they submit the form, then the dashboard is shown and a session cookie with 30-minute idle expiry is set.
- Given wrong credentials, when they submit, then the error text "Invalid email or password" is shown and no cookie is set.

### REQ-002: Account lockout
After 5 consecutive failed attempts within 15 minutes for one email, further attempts for that email are rejected for 15 minutes with the message "Too many attempts, try again in N minutes". Successful login resets the counter. Extends REQ-001.

**Acceptance criteria**
- Given 5 failures in 15 minutes, when a 6th attempt is made with correct credentials, then it is rejected with the lockout message and the remaining minutes.
- Given a lockout that expired, when the user logs in correctly, then login succeeds and the counter is 0.

### REQ-003: Password reset link
From the login screen the user requests a reset link by email. The link is valid for 60 minutes and single-use. Requesting a link for an unknown email shows the same confirmation as for a known one. Used by REQ-001.

**Acceptance criteria**
- Given a known email, when reset is requested, then an email with a link is sent within 1 minute and the UI shows "If the address exists, we sent a link".
- Given an unknown email, when reset is requested, then no email is sent and the same message is shown.
- Given a link older than 60 minutes or already used, when opened, then the page shows "This link has expired" and offers to request a new one.
