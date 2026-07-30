# Security Architecture and Deployment Gates

## Current critical findings

The inspected application cannot be safely exposed to the internet yet:

1. Passwords are stored and queried in plaintext.
2. Login returns identity attributes but no authenticated server-side session or
   signed token.
3. Authorization is enforced only through browser `localStorage` and redirects.
4. Workouts and metrics can be queried by an email supplied in the URL.
5. Plan update/delete does not verify the caller owns the plan.
6. Request logging records bodies and headers, including passwords and future
   bearer tokens.
7. Plan content is inserted into HTML without safe escaping, enabling stored
   XSS.
8. A Datadog API key is committed in `.env.example` and `docker-compose.yml`.
9. The Mongo seed creates known sample accounts with plaintext passwords.
10. Error responses can expose internal exception text.

These are release blockers, not optional hardening items.

## Immediate containment

Before implementation:

- Revoke/rotate the exposed Datadog API key at the provider.
- Review Datadog audit/usage records for unauthorized use.
- Remove the key from active files and prevent secret scanning recurrence.
- Decide whether Git history will be rewritten; rotation is required even if it
  is rewritten.
- Ensure sample accounts do not exist in any externally reachable database.
- Do not deploy the current routes to a public API.

No replacement secret should be pasted into chat, committed, or written to a
Terraform variable file.

## Authentication design

### First secure implementation

To minimize simultaneous product changes:

- Hash passwords with a maintained password-hashing library and a per-password
  salt.
- Never log password/hash material.
- On successful login, issue a short-lived signed access token.
- Store the signing key in an AWS secret service and retrieve/cache it at cold
  start.
- Keep tokens out of URL parameters.
- Prefer secure, `HttpOnly`, `Secure`, `SameSite` cookies if same-origin browser
  behavior is retained; otherwise document the bearer-token threat model.
- Add expiry and logout/revocation behavior appropriate to the chosen token
  lifetime.

Cognito is a valid later improvement that avoids custom password storage and
can integrate with an API Gateway JWT authorizer. It is deferred initially
because it changes registration, login, frontend token handling, and profile
storage at the same time as the compute migration.

### Authorization rules

- Identity comes from the verified token, never from an email path/body field.
- Clients can read/write only their own workouts and metrics.
- Trainers can create/list/update/delete only plans they own.
- Role claims are verified server-side.
- Update/delete operations use conditional database expressions to enforce
  ownership even if route middleware is bypassed by a coding error.
- Administrative/debug/test routes are removed or protected.

## Input and output safety

- Validate types, lengths, formats, enums, and numeric ranges server-side.
- Normalize email consistently.
- Store dates as ISO-8601 UTC timestamps.
- Bound query page size.
- Return opaque pagination cursors.
- Render user-provided content with `textContent` or an approved sanitizer.
- Add security headers suitable for the static frontend.
- Return generic unexpected-error messages with a correlation ID.
- Do not expose database hostnames, stack traces, secret ARNs, or IAM details.

## Logging policy

Allowed fields:

- timestamp
- severity
- request ID
- route template
- HTTP method/status
- duration
- application version
- environment
- safe error category

Forbidden fields:

- passwords and hashes
- complete request/response bodies
- authorization/cookie headers
- JWTs/session identifiers
- MongoDB URIs
- secret values
- unnecessary personal data

Email is personal data; prefer an irreversible correlation identifier in logs.

## Secrets

Possible transitional secrets:

- MongoDB URI
- JWT signing secret
- optional external observability credential

Controls:

- Store values in Secrets Manager or approved SSM SecureString design.
- Terraform manages identifiers, policies, and containers—not secret values.
- Lambda receives only the secret ARN/name and reads the value at runtime.
- Execution role can read only the exact required secret.
- Rotate on suspected disclosure and according to a documented schedule.
- Never upload Terraform plans containing secret-bearing values as artifacts.

## GitHub and AWS identity

- No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` repository secrets.
- OIDC trust checks audience and exact repository subject.
- Deployment role is bound to the protected `dev` GitHub environment.
- Pull-request code never receives the deployment role.
- Fork PRs run offline validation only.
- Actions are pinned to immutable commit SHAs.
- Workflow default permissions are empty/minimal and granted per job.

## Terraform state security

- Private S3 bucket with public-access block.
- TLS-only policy, encryption, and versioning.
- Separate object paths and IAM permissions per state.
- Native locking prevents concurrent writes.
- No application secret values in state.
- Plans are treated as sensitive and not broadly retained.

## Security acceptance tests

Deployment remains blocked until tests prove:

- duplicate email registration is rejected atomically,
- stored passwords are not plaintext,
- invalid/expired/tampered tokens return `401`,
- client-to-client data access returns `403` or non-disclosing `404`,
- trainer-to-trainer plan mutation is rejected,
- unauthenticated protected routes are rejected,
- logs contain no submitted password or token,
- plan content cannot execute script/HTML injection,
- error responses do not expose internals,
- OIDC roles cannot be assumed from another repository/branch,
- the Lambda role cannot access unrelated tables/secrets,
- secret scanning passes.

## Residual risks accepted for `dev`

- Cold-start latency.
- No WAF/custom domain initially.
- Seven-day log retention may be insufficient for long investigations.
- Custom JWT authentication has more implementation responsibility than
  Cognito.
- Cost alerts do not stop usage automatically.

These acceptances apply only to a low-traffic learning environment and must be
revisited before production use.
