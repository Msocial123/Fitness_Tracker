# Implementation Plan

## Current implementation status

Baseline: fork `Elzabeth-L/Fitness_Tracker`, commit
`469e68a732d2512aa05454d1c0975a41de0de62b`.

| Phase | Status | Evidence/remaining work |
|---|---|---|
| Phase 0 | Implemented locally | Exposed key removed from current files, seed credentials removed, sensitive auth logging removed, scans pass. Provider-side Datadog key revocation remains owner action. |
| Phase 1 | Core controls implemented locally | Password hashing, legacy hash upgrade, short-lived JWT cookie, server-side role/ownership checks, safe errors, XSS escaping, runtime secret loading, nine tests, and zero-audit dependency trees pass. Full Mongo-backed route integration tests remain. |
| Phase 2 | Implemented locally | Express app/local/Lambda entry points split, Mongo connection cached without retry timers, Lambda Node 22 Dockerfile added, and API Gateway v2 health adapter test added. Container build remains unverified because Docker is not installed. |
| Phase 3 | Foundation applied; remote state active | All infrastructure is consolidated under `infrastructure/` with one state. On 2026-07-14 the reviewed foundation plan created 25 AWS resources with `deploy_application=false`; the resulting state was migrated to encrypted, versioned S3 with native locking and verified by a zero-change plan. The JWT value is populated; the MongoDB URI and GitHub settings remain gates for the Lambda/API deployment. |
| Phase 7 | PR open; owner setup pending | Immutable-action PR validation and OIDC dev deployment workflows are in PR #4; validation passes and the plan job is intentionally skipped until GitHub variables/environment protection are configured. |
| Data migration | Not started | Runtime remains on transitional MongoDB. DynamoDB resources exist in Terraform, but repository/data migration must happen before MongoDB removal. |

Git is installed and the migration branch is pushed in PR #4. Docker remains
absent locally, so image construction is delegated to GitHub Actions.

## Planning principles

- Make security-safe progress in small, reversible phases.
- Do not combine the Lambda adaptation and DynamoDB rewrite into one untestable
  change.
- Every phase has entry criteria, deliverables, validation, and an approval gate.
- No application apply occurs until secrets, remote state, GitHub variables,
  environment protection, and the deployment plan are reviewed.
- Do not delete legacy deployment files.

## Phase 0 — Establish source and contain exposed credentials

### Entry criteria

- Owner confirms the intended repository/branch.
- Application source is checked out into this workspace.
- Existing documentation is merged without overwriting repository content.

### Work

- Revalidate findings against the checked-out commit.
- Revoke the committed Datadog API key.
- Remove the key from `.env.example` and Compose.
- Replace it with environment interpolation/placeholders.
- Enable repository secret scanning if available.
- Decide whether Git history cleanup is required.
- Ensure public/sample systems do not use seeded plaintext accounts.

### Validation

- Search tracked source for the revoked value and common credential patterns.
- Confirm no replacement secret is committed.
- Record provider-side rotation completion without recording the new secret.

### Gate

Security containment approved. No public deployment.

## Phase 1 — Test foundation and application security

### Work

- Correct root/server dependency ownership and deterministic install scripts.
- Add ESLint and test framework.
- Add Express route tests.
- Hash passwords and define safe migration behavior for existing users.
- Implement signed authentication or approve Cognito scope.
- Add server-side identity/role/ownership enforcement.
- Remove body/header credential logging.
- Fix stored-XSS rendering paths.
- Add centralized validation and error handling.
- Add `GET /health`.

### Validation

- Unit tests for validation and repositories/interfaces.
- Authentication tamper/expiry tests.
- Cross-user and cross-trainer authorization tests.
- XSS regression tests.
- Log-capture test proving passwords/tokens are absent.
- Dependency audit reviewed; findings triaged rather than blindly ignored.

### Gate

All checks in [Security acceptance tests](../security/README.md#security-acceptance-tests)
pass before any public endpoint is created.

## Phase 2 — Lambda adaptation

### Work

- Make `server/app.js` export the configured Express application.
- Add `server/local.js` for local listener behavior.
- Add `server/lambda.js` with `serverless-http`.
- Isolate/cache MongoDB initialization for the transitional version.
- Remove infinite connection retry timers from the Lambda path.
- Add `Dockerfile.lambda` using AWS Node.js 22 base image.
- Preserve the standard Dockerfile and Compose behavior.
- Disable Datadog agent tracing in the Lambda runtime.

### Validation

- Local server regression test.
- Direct handler tests using API Gateway HTTP API payload v2 events.
- Runtime Interface Emulator container test.
- Static HTML/CSS/JS/image requests.
- Health, 404, validation, and error responses.
- Cold and warm invocation behavior.
- Confirm no write outside `/tmp`.

### Gate

Application behaves equivalently locally and through Lambda event adaptation.

## Phase 3 — Single-module foundation stage

### Work

- Add pinned Terraform/provider versions and cross-platform lock file.
- Create S3 state bucket configuration.
- Create ECR with immutability/scanning/lifecycle.
- Create GitHub OIDC provider and scoped plan/deploy roles.
- Add budget.
- Produce non-sensitive outputs.
- Run the first apply with `deploy_application=false` using the approved local
  AWS identity.
- Migrate the single local state into its new S3 backend.

### Validation

- `terraform fmt`, init, validate, plan review.
- IAM trust-policy negative tests.
- State bucket public-access/encryption/versioning checks.
- ECR tag-overwrite rejection check.
- Budget subscription confirmation.

### Gate

Owner reviews the bootstrap plan before apply and verifies created resources
after apply.

## Phase 4 — Single-module application stage

### Work

- Add Lambda execution role, log group, function/version/alias.
- Add API Gateway HTTP API, integration, route, stage, logs, permission.
- Add throttling, reserved concurrency, tags, and outputs.
- Store transitional MongoDB URI outside Terraform state.
- Deploy a commit-SHA image by digest.

### Validation

- Terraform plan contains only expected resources.
- `/health` works.
- Static frontend works.
- Authenticated route smoke tests pass.
- Logs are sanitized.
- Lambda has no VPC/NAT.
- Atlas network access is reviewed and accepted.

### Gate

If Atlas requires unsafe permanent broad access, do not make this deployment
public; proceed to DynamoDB before public release.

## Phase 5 — DynamoDB repositories and infrastructure

### Work

- Add four DynamoDB tables and plans GSI.
- Add execution-role table permissions.
- Implement DynamoDB document client and repository interfaces.
- Replace route-level Mongoose calls.
- Add pagination and ISO timestamp handling.
- Use conditional uniqueness and ownership writes.
- Update frontend response/identifier assumptions.

### Validation

- Repository contract tests against DynamoDB Local or a controlled test table.
- Pagination and ordering tests.
- Conditional conflict/ownership tests.
- Capacity/throttling behavior test.
- Terraform table schema review.

### Gate

All existing user journeys pass against DynamoDB in an isolated environment.

## Phase 6 — Data migration and cutover

### Work

- Inventory source collection counts and data quality.
- Define deterministic mapping for IDs, dates, normalized emails, and password
  state.
- Create idempotent migration script with dry-run mode.
- Take an approved source backup.
- Migrate users, workouts, metrics, and plans.
- Verify counts, samples, constraints, and access patterns.
- Switch application configuration to DynamoDB.
- Keep MongoDB read-only for an agreed rollback window.

### Validation

- Source/destination record reconciliation.
- Duplicate/conflict report reviewed.
- Representative users can access historical data.
- New writes appear only in DynamoDB after cutover.
- Rollback procedure tested before source retirement.

### Gate

Owner signs off data verification before MongoDB removal.

## Phase 7 — GitHub Actions

### Work

- Implement PR validation and trusted plan behavior.
- Implement protected `dev` deployment workflow.
- Configure repository/environment variables from foundation-stage outputs.
- Configure GitHub environment protection.
- Pin action revisions.
- Implement ECR digest resolution and health verification.

### Validation

- Fork PR role-denial test.
- PR produces no apply.
- Main deployment pushes only SHA tag.
- Duplicate tag push fails.
- Concurrent deployment serialization test.
- Health failure causes workflow failure.
- Rollback drill.

### Gate

CI/CD becomes the supported deployment path; manual application applies stop.

## Phase 8 — Decommission and optimize

### Work

- Remove Mongoose/MongoDB runtime dependencies after rollback window.
- Remove transitional database secret/access.
- Move legacy deployment assets under `legacy/deployment/`.
- Update root README and operating runbooks.
- Measure memory/cold start/duration and tune Lambda.
- Evaluate S3/CloudFront frontend delivery separately.

### Validation

- No MongoDB runtime reference remains.
- No `latest` tag appears in supported deployment files.
- No prohibited infrastructure appears in Terraform.
- `terraform destroy` procedure tested in disposable `dev` where safe.

## Inputs and decisions required from the owner

Do not provide secret values in chat or source.

1. Confirmed source repository: `Elzabeth-L/Fitness_Tracker`.
2. Confirm whether deployment remains on `master` or moves to `main`.
3. Confirm the AWS account is the intended learning account and `ap-south-1` is
   enabled.
4. Confirm whether MongoDB Atlas exists and contains data that must be migrated.
5. Choose authentication direction:
   - secure custom password/JWT implementation for the first release, or
   - expand scope to Cognito now.
6. Choose CI Terraform provider distribution:
   - official registry download on hosted runners (recommended), or
   - controlled HTTPS network mirror.
7. Provide the budget notification email through local configuration, not chat
   if privacy is a concern.
8. Choose the monthly budget threshold; USD 5 is the proposed default.
9. Decide whether GitHub `dev` requires manual deployment approval.
10. Confirm whether historical Git rewriting is acceptable for credential
    cleanup after rotation.

## Definition of done

- Current security blockers are fixed and regression tested.
- Application runs locally and as a Lambda container.
- DynamoDB holds application data using documented access patterns.
- No application upload bucket exists without a feature requirement.
- Terraform creates only approved architecture in `ap-south-1`.
- Remote state is private, encrypted, versioned, and locked.
- GitHub uses OIDC and no long-lived AWS keys.
- Images use SHA tags and digest deployments; no `latest`.
- PRs never apply.
- Deployment verifies health and supports rollback.
- Cost controls, logs, budget, destroy, and recovery procedures are documented
  and tested proportionally to `dev` risk.

## Immediate next action

The repository working tree is now present at fork commit
`469e68a732d2512aa05454d1c0975a41de0de62b`, and Phase 0 containment changes
have started. Git is not installed and `.git` is an empty placeholder, so the
next tooling action is to install Git and attach this working tree to the fork
before a commit or push. Do not jump directly to Terraform apply.
