# Architectural and Infrastructure Decision Log

## How to use this log

Each decision records the selected option, alternatives, justification,
consequences, and the condition under which it should be revisited. Status is
**Proposed** until implementation is explicitly approved and verified.

## Decision summary

| ID | Decision | Status |
|---|---|---|
| D001 | Use Lambda container compute instead of ECS Fargate | Proposed |
| D002 | Adapt Express with `serverless-http` | Proposed |
| D003 | Serve static frontend through Express initially | Proposed |
| D004 | Use separate DynamoDB tables | Proposed |
| D005 | Migrate MongoDB in controlled stages | Proposed |
| D006 | Keep Lambda outside a customer VPC | Proposed |
| D007 | Create ECR in the first stage of the single module | Implemented |
| D008 | Deploy immutable Git SHA tags and ECR digests | Proposed |
| D009 | Authenticate GitHub Actions through OIDC | Proposed |
| D010 | Use S3 native Terraform state locking | Proposed |
| D011 | Use one root module and one Terraform state | Implemented |
| D012 | Keep secrets out of Terraform values and state | Proposed |
| D013 | Apply strict dev cost guardrails | Proposed |
| D014 | Preserve legacy deployment assets | Proposed |
| D015 | Treat security remediation as a deployment gate | Proposed |
| D016 | Use Node.js 22 on Linux AMD64 initially | Proposed |
| D017 | Use CloudWatch as initial observability platform | Proposed |
| D018 | Permit registry provider download on hosted CI or supply a network mirror | Needs owner decision |

## D001 — Lambda container compute instead of ECS Fargate

**Decision:** Run the web application as a Lambda container behind API Gateway
HTTP API.

**Alternatives:** ECS Fargate service, EKS, EC2, or Lambda ZIP deployment.

**Justification:** The workload is low-traffic, stateless request/response CRUD.
It contains no WebSockets, persistent worker, or long-running job. Lambda scales
to zero and avoids a continuously billed task, load balancer, cluster, and
service. A container retains a familiar Docker build and supports the existing
Node dependency layout during migration.

**Consequences:** Express must be adapted; cold starts are possible; HTTP API
integration requests must complete within 30 seconds; the local filesystem is
ephemeral and only suitable for bundled read-only assets or `/tmp` scratch data.

**Revisit when:** Requests become consistently high, work exceeds HTTP/Lambda
timeouts, or persistent connections/background workers are introduced.

## D002 — Adapt Express with `serverless-http`

**Decision:** Split application construction from local listening and export a
Lambda handler using `serverless-http`.

**Alternatives:** AWS Lambda Web Adapter, a custom API Gateway event router, or
rewriting each route as a separate Lambda.

**Justification:** The application has a small conventional Express surface.
`serverless-http` requires the least infrastructure and container behavior,
preserves middleware/routes, and avoids running a persistent HTTP listener in
Lambda. A custom rewrite would increase scope without a current benefit.

**Consequences:** Express 5/API Gateway v2 behavior must be covered by
integration tests. `app.listen()` remains only in `server/local.js`.

**Revisit when:** Adapter compatibility fails, streaming is required, or the
application is decomposed into independently scaled functions.

## D003 — Serve static frontend through Express initially

**Decision:** Bundle `public/` into the Lambda image and serve it through the
same API Gateway endpoint for the first release.

**Alternatives:** Private S3 plus CloudFront, public S3 website hosting, or a
separate frontend platform.

**Justification:** Relative API paths already work this way. It minimizes the
first deployment's moving parts and avoids CORS, CloudFront routing, cache
invalidation, and a second delivery pipeline while security and data access are
being rewritten.

**Consequences:** Static page and image requests invoke Lambda and can be slower
or costlier than CDN delivery. This is acceptable for a low-traffic dev system.

**Revisit when:** Static traffic becomes meaningful or the API has stabilized.

## D004 — Use separate DynamoDB tables

**Decision:** Create separate Users, Workouts, Metrics, and Plans tables.

**Alternatives:** A single-table DynamoDB design or retaining MongoDB.

**Justification:** Current access patterns are independent and simple. Separate
tables map directly to existing concepts, are easier to teach and troubleshoot,
and reduce migration risk. The workload does not currently require multi-entity
queries that justify a single-table design.

**Consequences:** More Terraform resources and capacity settings; no cross-table
transactions unless explicitly added. Email relationships remain application
managed.

**Revisit when:** New access patterns require fetching several entity types in
one query or table count/operations become burdensome.

## D005 — Migrate MongoDB in controlled stages

**Decision:** Separate Lambda adaptation from the DynamoDB repository rewrite,
with a verification and rollback window.

**Alternatives:** A single big-bang compute/database migration or permanent
MongoDB Atlas use.

**Justification:** Compute adaptation and persistence redesign fail in different
ways. Independent stages make route regressions, data mapping errors, and
network issues diagnosable and reversible.

**Consequences:** Transitional MongoDB configuration exists temporarily. A
public transitional deployment is allowed only if Atlas connectivity is secure;
otherwise DynamoDB migration precedes public release.

**Revisit when:** A secure MongoDB transition is impossible or there is no data
worth migrating, in which case a direct DynamoDB cutover is simpler.

## D006 — Keep Lambda outside a customer VPC

**Decision:** Do not attach the DynamoDB-backed Lambda to a VPC.

**Alternatives:** Private subnets with NAT Gateway, VPC endpoints, or public
subnets.

**Justification:** DynamoDB and AWS control-plane APIs are available without
placing Lambda in a customer VPC. Avoiding the VPC removes ENI complexity and
the need for NAT. A public subnet does not give Lambda a public IP and would not
solve egress safely.

**Consequences:** The function cannot reach private VPC-only systems. Temporary
MongoDB Atlas access uses public egress with non-static addresses.

**Revisit when:** A private database/service is required and the cost of VPC
endpoints or controlled egress is accepted.

## D007 — Create ECR in the first stage of the single module

**Decision:** Provision ECR with `deploy_application=false` before enabling the
Lambda/API resources in the same module.

**Alternatives:** Create ECR in the application stack or imperatively in the
deployment workflow.

**Justification:** Lambda creation requires an existing image, and an image push
requires an existing repository. A boolean stage gate resolves this dependency
while keeping every resource in one module and state.

**Consequences:** A foundation-only first apply is required. Later deployments
set `deploy_application=true` and apply the same state.

**Revisit when:** A central platform account owns shared registries.

## D008 — Deploy immutable Git SHA tags and ECR digests

**Decision:** Tag images with the full commit SHA, make ECR tags immutable, then
pass the resolved `repository@sha256:digest` URI to Terraform.

**Alternatives:** `latest`, environment tags, timestamp tags, or tag-only Lambda
configuration.

**Justification:** A digest identifies exact bytes, makes Terraform plans
meaningful, supports reliable rollback, and prevents tag drift.

**Consequences:** Every deploy creates a new image. ECR lifecycle rules must
retain a bounded rollback set.

**Revisit when:** A signed release promotion system supplies equivalent immutable
artifact identities.

## D009 — Authenticate GitHub Actions through OIDC

**Decision:** Use GitHub's OIDC identity provider and scoped IAM roles.

**Alternatives:** IAM user access keys, self-hosted runner credentials, or manual
deployments.

**Justification:** OIDC issues short-lived role sessions and removes long-lived
AWS keys from GitHub. Trust can be restricted to the repository, branch, and
protected GitHub environment.

**Consequences:** The first module stage must create the provider/roles. Workflows need
`id-token: write`; trust policy conditions and environment protection are
security-critical. AWS normalizes the provider certificate thumbprint after
creation, so Terraform ignores drift only for `thumbprint_list` to prevent a
perpetual plan. Terraform still manages the provider URL, audience, exact
repository subjects, and role trust policies.

**Revisit when:** Organization-wide identity and deployment roles are provided.

## D010 — Use S3 native Terraform state locking

**Decision:** Store state in versioned encrypted S3 and set `use_lockfile=true`.

**Alternatives:** Deprecated DynamoDB locking, local state, Terraform Cloud, or
another remote backend.

**Justification:** Native S3 locking is supported by the installed Terraform
version and avoids a lock table whose mechanism is deprecated. Bucket versioning
supports recovery from accidental state changes.

**Least-privilege detail:** Terraform plans also acquire the native `.tflock`
object. The GitHub plan role may create and delete only that lock object; it may
read but cannot write the Terraform state object. The deployment role can write
both state and lock objects.

**Consequences:** The deployment role needs narrowly scoped lock-object delete
permission. The backend bucket must be created before backend migration.

**Revisit when:** Moving to an organization-managed Terraform platform.

## D011 — Use one root module and one Terraform state

**Decision:** Place all foundational and application resources in the single
root module at `infrastructure/` and use one state key.

**Alternatives:** Separate foundation/application roots and states, or child
modules called by several roots.

**Justification:** The project requirement is one module for the entire
environment. `deploy_application` handles the image dependency, while an
inactive backend template handles state-bucket creation without another root.

**Consequences:** The first apply uses local state, followed by migration to S3.
Foundational and application changes share blast radius, so targeted teardown
is not the normal operating model.

**Revisit when:** A central platform provisions foundational resources.

## D012 — Keep secrets out of Terraform values and state

**Decision:** Terraform manages secret containers and IAM access, but secret
values are populated through an approved secret-management operation and read
by the application at runtime.

**Alternatives:** Lambda plaintext environment variables, `terraform.tfvars`,
GitHub variables, or secret values in Terraform resources.

**Justification:** Terraform state records sensitive resource arguments even
when marked `sensitive`. Runtime retrieval limits duplication and rotation
impact.

**Consequences:** Secret initialization/rotation is a separate runbook step.
Secrets Manager may incur a small recurring charge; SSM SecureString can be
evaluated where rotation features are unnecessary.

**Revisit when:** Cognito eliminates the application JWT secret or a managed
organization secret platform is introduced.

## D013 — Apply strict dev cost guardrails

**Decision:** Use low provisioned DynamoDB capacity, Lambda reserved concurrency
2, API rate/burst throttles, seven-day logs, ECR retention, S3 lifecycle rules,
and an account-wide AWS Budget alert.

**Alternatives:** Default service limits or unlimited on-demand scaling.

**Justification:** This is a learning account where bounded cost is more
important than peak throughput. Reserved concurrency is a ceiling; provisioned
concurrency is intentionally not used.

**Consequences:** Load spikes can return throttling responses. Budget alerts are
notifications, not hard spending caps.

**Revisit when:** Real traffic and service-level objectives are defined.

## D014 — Preserve legacy deployment assets

**Decision:** Move Jenkins, Azure Pipelines, Kubernetes, Helm, Ansible, and
superseded GitHub workflow assets under
`legacy/deployment/` without deleting them.

**Alternatives:** Delete them or leave active-looking files at repository root.

**Justification:** Preservation retains learning/history, while relocation makes
it clear they are not the supported AWS deployment path and prevents accidental
use of EKS, LoadBalancer services, third-party images, and `latest` tags.

**Consequences:** Legacy relative paths may no longer execute without adjustment;
that is acceptable because they are explicitly unsupported.

**Revisit when:** The owner approves archival or deletion after the serverless
deployment is proven.

## D015 — Treat security remediation as a deployment gate

**Decision:** Do not expose the current application publicly until critical
security findings are fixed and tested.

**Alternatives:** Deploy first and secure later, or limit security to network
controls.

**Justification:** Plaintext passwords, missing API authorization, credential
leakage, sensitive logging, and stored-XSS are application flaws that a private
network or API Gateway cannot correct.

**Consequences:** Infrastructure work does not produce a public application
until the security acceptance tests pass.

**Revisit when:** Never for public deployment; only a fully isolated local test
may temporarily exercise the original behavior.

## D016 — Use Node.js 22 on Linux AMD64 initially

**Decision:** Build from `public.ecr.aws/lambda/nodejs:22` for `linux/amd64`.

**Alternatives:** Node 24, ARM64, or the current Node 18 Alpine image.

**Justification:** Node 22 is an AWS-supported Lambda base with a compatibility
window for current Express/Mongoose dependencies. AMD64 minimizes native-module
surprises during the first migration. The AWS base includes the runtime
interface client and emulator.

**Consequences:** The version must be upgraded before runtime deprecation. ARM64
cost/performance benefits are deferred until tests cover the full dependency
set.

**Revisit when:** Dependencies are validated on Node 24 or ARM64.

## D017 — Use CloudWatch as initial observability platform

**Decision:** Emit sanitized structured JSON to CloudWatch Logs and use native
Lambda/API metrics initially.

**Alternatives:** Datadog agent/extension, X-Ray, OpenTelemetry, or another SaaS.

**Justification:** CloudWatch is already integrated with Lambda, has fewer
runtime dependencies, and avoids reintroducing the exposed Datadog credential
or an agent cold-start/cost burden during migration.

**Consequences:** Existing Datadog tracing is disabled in Lambda. Advanced
tracing is deferred; logs need retention controls.

**Revisit when:** Native metrics are insufficient and observability cost is
approved.

## D018 — Terraform provider acquisition on hosted runners

**Decision:** GitHub-hosted runners download the exactly pinned AWS provider
from the official Terraform registry. The laptop continues using its global
filesystem mirror.

**Alternatives:** Commit provider binaries, use the laptop filesystem mirror, or
self-host runners.

**Justification:** The laptop's global filesystem mirror is not present on
GitHub-hosted Linux runners. Committing large platform binaries is poor source
control practice, and a Windows provider cannot execute on Linux.

**Consequences:** Hosted runners require outbound access to HashiCorp's official
distribution endpoints. Cross-platform lock files still need to be generated
and committed from a network that permits the official Linux provider download
(the current network returned HTTP 403). Until then the exact `6.54.0` version
is pinned but CI generates its platform lock during initialization.

**Revisit when:** The runner model or organization Terraform distribution policy
changes.

## D019 — Keep secret containers in the single module state

**Decision:** The single module creates the JWT and transitional MongoDB Secrets
Manager containers, and the Lambda execution role can read only their ARNs.

**Alternatives:** Create secrets in the application stack, place plaintext in
Lambda environment variables, or put secret values in Terraform resources.

**Justification:** Containers must exist and be populated before the first
Lambda smoke test. Keeping them foundational also preserves credentials during
routine application teardown, while excluding values from Terraform prevents
their inclusion in state.

**Consequences:** Secret value creation and rotation is a separate owner
operation. A full module destroy includes secret containers and therefore
requires an explicit credential-retention decision.

**Revisit when:** Cognito replaces custom JWT signing and DynamoDB cutover
eliminates the MongoDB credential.
