# API token revocation

### REQ-101: Revoke a token
A workspace owner revokes an active API token from the token settings page. The token becomes invalid immediately and remains listed as Revoked.

**Acceptance criteria**
- Given an active token, when its owner clicks Revoke and confirms, then the token is listed as Revoked.
- Given a revoked token, when an API request authenticates with it, then the server returns HTTP 401.
- Given a member without the owner role, when a token revocation is requested, then the server returns HTTP 403 and the token remains active.
