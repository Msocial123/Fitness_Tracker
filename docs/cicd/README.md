# GitHub Actions CI/CD Design

## Goals

- Use GitHub-hosted runners.
- Authenticate to AWS with short-lived OIDC sessions.
- Validate every pull request without applying infrastructure.
- Build this repository's Lambda image and push only immutable artifacts.
- Apply only from the protected deployment branch/environment.
- Verify the deployed API before declaring success.
- Support deterministic rollback.

## Workflow inventory

```text
.github/workflows/
├── pr.yml
└── deploy-dev.yml
```

The first foundation apply is local because the OIDC role and ECR repository do
not exist yet. It runs the same module with `deploy_application=false`, then
migrates its state to S3. Hosted workflows subsequently apply that one module
with `deploy_application=true` and an immutable image digest.

## Existing fork pipeline assessment

The fork originally contained `.github/workflows/fitness-tracker.yml`. It was
archived at `legacy/deployment/github-actions/fitness-tracker.yml` because it:

- suppresses test failures with `npm test || true`,
- uses nondeterministic `npm install`,
- relies on long-lived Docker Hub username/password secrets,
- pushes to Docker Hub rather than the owner's ECR repository,
- does not validate Terraform,
- does not use AWS OIDC,
- does not deploy or health-check the target AWS stack,
- references floating action tags rather than immutable action commits.

It has been replaced by `pr.yml` and `deploy-dev.yml`. Azure Pipelines,
Jenkins, Ansible, Sonar, and Kubernetes configuration is preserved under
`legacy/deployment/` and is intentionally inactive.

## Pull request workflow

### Permissions

Default to:

```yaml
permissions:
  contents: read
```

Only the trusted plan job receives `id-token: write`. Forked/untrusted pull
requests do not receive an AWS role.

### Jobs

#### Application validation

1. Checkout the pull-request revision.
2. Set up Node.js 22 and npm cache.
3. Run deterministic `npm ci` for the consolidated dependency structure.
4. Run ESLint.
5. Run unit tests.
6. Run route/security integration tests.
7. Build the Lambda image without pushing:

   ```text
   docker buildx build --platform linux/amd64 --provenance=false \
     -f Dockerfile.lambda --load -t fitness-tracker:pr-${sha} .
   ```

8. Invoke representative API Gateway v2 events against the local Runtime
   Interface Emulator or run handler-level integration tests.

#### Terraform static validation

1. `terraform fmt -check -recursive`
2. Initialize each root with `-backend=false` where appropriate.
3. `terraform validate`
4. Optional policy/security scanners after their versions and rules are agreed.

#### Trusted Terraform plan

Run only for branches in the same repository under an approved read-only OIDC
role:

1. Request OIDC token.
2. Assume the plan role.
3. Initialize the S3 backend.
4. Supply a syntactically valid candidate image URI.
5. Run `terraform plan -detailed-exitcode`.
6. Present a sanitized summary in the workflow/job summary.
7. Do not apply and do not expose a binary plan artifact broadly.

For fork PRs, skip the AWS-backed plan and clearly report why; static validation
still runs.

## Deployment workflow

### Trigger and concurrency

- Trigger on push to the agreed deployment branch (`master` until changed).
- Bind the job to GitHub environment `dev`.
- Configure one deployment concurrency group without canceling an active apply.
- Optionally require manual environment approval.

### Permissions

```yaml
permissions:
  contents: read
  id-token: write
```

No write permission to repository content is required.

### Ordered deployment

1. Checkout the exact commit.
2. Re-run fast tests and Terraform validation.
3. Assume the scoped deployment role through OIDC.
4. Call STS identity and verify expected AWS account/role.
5. Verify the foundation-stage outputs/ECR repository exist; do not create them
   imperatively.
6. Log Docker into ECR using the short-lived role session.
7. Build for `linux/amd64` with `--provenance=false`.
8. Tag with the full `${GITHUB_SHA}` only.
9. Push to ECR.
10. Wait for the ECR scan result according to the agreed severity policy.
11. Resolve the image digest with `describe-images`.
12. Construct `<repository-uri>@sha256:<digest>`.
13. Initialize the `dev` Terraform backend.
14. Run `terraform plan -out=<ephemeral-plan>` with
    `TF_VAR_image_uri` set to the digest URI.
15. Apply exactly the saved plan.
16. Read `health_url`, deployed image digest, and Lambda version from Terraform
    outputs.
17. Retry `GET /health` with bounded exponential backoff.
18. Run a small unauthenticated/authentication-negative smoke test.
19. Fail the deployment if health/security checks fail.
20. Add commit, digest, Lambda version, API URL, and plan result to the job
    summary.

No `latest` tag is created at any point.

## Image provenance and dependency strategy

- Use `npm ci`, never an unpinned `npm install`, in CI images.
- Commit lock files.
- Pin the Lambda base to a deliberate Node major and optionally a base-image
  digest after defining an update process.
- Pin GitHub Actions to commit SHAs.
- Keep ECR scanning enabled.
- Fail on critical findings after a documented exception mechanism exists.
- Rebuild periodically for base-image security fixes even without application
  changes.

## Terraform provider acquisition

The developer laptop has an AWS provider 6.54.0 filesystem mirror for Windows
AMD64. GitHub-hosted runners use Linux AMD64 and cannot use that binary or local
path.

Supported choices:

### Choice A — Official registry, selected

- Pin AWS provider `6.54.0` in Terraform.
- Commit a lock file containing Linux and Windows checksums.
- Allow the hosted runner to download the provider from the official registry.
- Cache downloads for speed, but do not treat cache as the source of truth.

This is the lowest-maintenance CI option.

The provider version is pinned now. Cross-platform lock-file generation is a
tracked handoff item because this network blocks the official Linux package;
Windows-only lock files are deliberately not committed because they would make
Linux CI fail checksum verification.

### Choice B — HTTPS network mirror, deferred

- Publish verified Linux and Windows provider packages and index metadata to a
  controlled HTTPS mirror.
- Configure runner `terraform.rc` dynamically.
- Protect mirror write access and verify package checksums/signatures.
- Define update, retention, and incident processes.

The existing laptop filesystem mirror alone is insufficient. Committing provider
binaries into the repository is rejected because of size, platform duplication,
review difficulty, and supply-chain maintenance.

## Environment configuration

Suggested non-secret repository/environment variables:

- `AWS_REGION=ap-south-1`
- `AWS_ACCOUNT_ID`
- `AWS_PLAN_ROLE_ARN`
- `AWS_DEPLOY_ROLE_ARN`
- `ECR_REPOSITORY_URL`
- `TF_STATE_BUCKET`
- `BUDGET_NOTIFICATION_EMAIL`
Secret containers and their ARNs are owned by the single Terraform module.
MongoDB URI and JWT key values never flow through GitHub Actions. No AWS access
key is stored in GitHub.

## Rollback

Preferred rollback changes the Lambda `dev` alias to the prior published
version whose image digest remains in ECR.

Rollback prerequisites:

- retain multiple immutable images,
- publish Lambda versions,
- record version/digest per deployment,
- do not immediately delete the previous version,
- ensure database changes are backward compatible during the rollback window.

Terraform remains the configuration source of truth. An emergency alias change
must be followed by a Terraform variable/configuration update so the next apply
does not unintentionally restore the failed version.

## Failure handling

- Build/test failure: no push or infrastructure change.
- Image push failure: no Terraform apply.
- Scan-policy failure: do not deploy the image.
- Terraform plan failure: no apply.
- Terraform apply failure: preserve logs and state; do not rerun blindly.
- Health failure: mark deployment failed and execute the documented rollback
  decision; do not hide failure with retries beyond the bounded window.
- State lock remains: confirm no apply is running before force-unlock; record
  justification and lock ID.

## Pipeline acceptance criteria

- Fork PR cannot assume an AWS role.
- PR workflow cannot apply Terraform.
- Deployment role cannot be assumed from another repository or branch.
- No long-lived AWS credentials exist in GitHub.
- ECR rejects tag overwrite.
- Terraform receives an image digest.
- Two simultaneous deploys cannot apply concurrently.
- A failed health check fails the workflow.
- Previous version rollback has been tested once in `dev`.
