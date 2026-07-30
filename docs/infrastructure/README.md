# Infrastructure Architecture

## Principles

1. Terraform manages infrastructure; workflows orchestrate Terraform and image
   publication but do not create ad hoc application resources.
2. One Terraform root module and one state own the entire environment; a
   staged first run handles dependencies without splitting ownership.
3. IAM permissions are scoped by repository, branch/environment, action, and
   resource ARN where AWS supports it.
4. The `dev` account design prioritizes bounded cost over high throughput.
5. No secret value is stored in source, `.tfvars`, plan artifacts, or Terraform
   state.

## Terraform layout

```text
infrastructure/
├── versions.tf, providers.tf
├── variables.tf, application-variables.tf
├── state.tf, backend.tf.example
├── ecr.tf, github-oidc.tf, github-iam.tf
├── budget.tf, secrets.tf
├── dynamodb.tf, logs.tf, lambda-iam.tf
├── lambda.tf, api.tf
├── outputs.tf, application-outputs.tf
└── terraform.tfvars.example
```

All `.tf` files in this directory form one root module. There are no child
modules and no second Terraform state.

Versions are pinned, not broad floating constraints. A cross-platform lock file
with `windows_amd64` and `linux_amd64` checksums remains a documented follow-up;
the local Windows-only lock is ignored so it cannot break hosted Linux CI.

## Foundation stage of the single module

### State bucket

Create an account-unique S3 bucket with:

- all public access blocked
- bucket-owner-enforced object ownership
- versioning enabled
- default SSE-S3 encryption
- TLS-only bucket policy
- lifecycle expiry for old noncurrent versions after an agreed recovery window
- deletion protection through Terraform lifecycle policy during normal use

SSE-S3 is selected instead of a customer-managed KMS key for `dev` to avoid key
cost and additional key-policy complexity. State must never contain application
secret values regardless of encryption.

Use a partial backend configuration:

```hcl
terraform {
  backend "s3" {
    key          = "fitness-tracker/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

The bucket name is supplied at initialization rather than duplicated across
source files. S3 native locking is used because DynamoDB-based backend locking
is deprecated.

### ECR

Create `fitness-tracker` or `fitness-tracker-dev` with:

- immutable tags
- scan on push
- SSE-S3 repository encryption
- lifecycle rule retaining the newest 5–10 deployable images
- short retention for untagged/interrupted-build images
- repository policy required by Lambda

ECR is foundational because the first Lambda application apply requires an
existing image.

### GitHub OIDC and roles

Create the GitHub provider for:

- URL: `https://token.actions.githubusercontent.com`
- audience: `sts.amazonaws.com`

Create separate roles:

#### Plan role

- Trust only the exact owner/repository and approved pull-request subject.
- Read Terraform state and lock objects as required for refresh/plan.
- Read AWS resources managed by the application.
- No ECR push, Terraform apply, destructive APIs, or IAM mutation.

Because Terraform refresh invokes many service-specific read APIs, the final
policy must be verified from an actual plan and tightened iteratively. It must
not use `AdministratorAccess`.

#### Deployment role

- Trust only the exact repository and protected `dev` environment/branch.
- Read/write the single module state object and lock object.
- Push images to the one ECR repository.
- Manage named/prefixed application resources.
- Pass only the Lambda execution role.
- Manage only explicitly named IAM roles/policies required by this application.

The trust policy validates both `aud=sts.amazonaws.com` and the exact `sub`.
GitHub environment protection restricts deployable branches and can require
manual approval.

### Budget

Create an account-wide monthly cost budget of USD 5, with alerts at 50%, 80%,
and 100% actual/forecast spend. Account-wide scope is deliberate because a
tag-filtered budget can miss untaggable services or costs incurred before cost
allocation tags become active. The owner supplies the notification email. A
budget is an alert, not an enforcement boundary.

## Application stage of the single module

### Lambda execution IAM

Allow only:

- CloudWatch log stream creation and log events for the function log group
- `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, and `Query` on the four
  application tables and required index ARNs
- read of the exact transitional secret ARN, if used
- optional X-Ray actions only if tracing is later enabled

Do not grant S3 access because the initial application has no object-storage
feature. Do not grant broad `dynamodb:*` or `secretsmanager:*`.

### Lambda function

- Package type: `Image`
- Image URI: ECR digest supplied at deployment
- Architecture: `x86_64`
- Memory: 512 MB initial
- Timeout: 15–20 seconds
- Reserved concurrency: 2
- Ephemeral storage: default 512 MB
- Environment: non-secret table names, `NODE_ENV=production`, `APP_ENV=dev`,
  `APP_VERSION=<git-sha>`, and an optional secret ARN
- Publish version: enabled
- Alias: `dev`

The API integration targets the alias so rollback changes the alias rather than
rebuilding infrastructure.

### API Gateway

- Protocol: HTTP API
- Integration: Lambda proxy payload v2.0
- Route: `$default`
- Stage: `dev` or `$default`, selected consistently with output URLs
- Auto-deploy: acceptable for Terraform-managed `dev`
- Throttling: suggested rate 2 RPS, burst 5
- Access logging: JSON with request ID, route, status, response length, and
  latency; no authorization header or request body
- Lambda invoke permission scoped to the API execution ARN

### DynamoDB

Four Standard-class tables use provisioned capacity:

| Resource | Read | Write | Notes |
|---|---:|---:|---|
| Users | 1 | 1 | email PK |
| Workouts | 1 | 1 | email/date composite key |
| Metrics | 1 | 1 | email/date composite key |
| Plans | 1 | 1 | plan ID PK |
| Plans trainer GSI | 1 | 1 | trainer/date query |

Settings:

- AWS-owned encryption
- PITR disabled in `dev`
- TTL disabled
- streams disabled
- deletion protection disabled only because `dev` is intentionally disposable
- tags on every table

Use on-demand backups only before destructive migration/cutover operations and
delete them according to the documented retention decision.

### CloudWatch

- Explicit Lambda log group with seven-day retention
- Explicit API access log group with seven-day retention
- No paid dashboard initially
- Native metrics monitored: Lambda Errors, Throttles, Duration, Concurrent
  Executions; API 4XX/5XX/Latency; DynamoDB throttled requests
- Optional alarms added only after notification destination and cost are agreed

## Networking

The target stack creates no VPC, subnet, route table, internet gateway, NAT
Gateway, load balancer, VPC endpoint, or public IPv4 resource.

This is intentional:

- API Gateway is the public ingress.
- Lambda service networking reaches AWS public service endpoints.
- DynamoDB needs no customer VPC route.
- Removing VPC attachment prevents NAT dependency and reduces cold/network
  operational complexity.

Temporary MongoDB Atlas access is a migration exception, not the target design.

## Naming and tagging

Names follow `<application>-<environment>-<resource>` where AWS length rules
permit, for example `fitness-tracker-dev-workouts`.

Required tags:

```text
Application = fitness-tracker
Environment = dev
ManagedBy   = terraform
Repository  = Elzabeth-L/Fitness_Tracker
CostCenter  = learning
```

Do not put email addresses, secrets, or tokens in tags.

## Terraform outputs

Foundation outputs from the single module:

- state bucket name
- ECR repository name and URI
- GitHub plan role ARN
- GitHub deployment role ARN
- JWT secret ARN
- transitional MongoDB secret ARN

Application-stage outputs from the same module:

- API base URL
- health URL
- Lambda function and alias
- deployed image URI/digest
- DynamoDB table names
- log group names

Outputs must not contain secret values.

Secret containers are foundational resources so their values can be populated
before the first Lambda deployment and survive routine application teardown.
Terraform never manages their values; this prevents secret material from being
recorded in state.

## Cost boundaries

- Lambda scales to zero; reserved concurrency limits parallel execution.
- API throttling limits request amplification.
- DynamoDB 1/1 provisioned capacity bounds table throughput.
- Seven-day log retention limits storage growth.
- ECR lifecycle limits image storage.
- State version lifecycle limits noncurrent state accumulation while retaining
  a recovery window.
- No PITR, NAT, ALB, ECS service, EKS, RDS, DocumentDB, custom KMS key, or
  provisioned concurrency in `dev`.

Potential charges remain for requests/compute beyond allowances, API Gateway,
ECR, S3, CloudWatch, DynamoDB backups, data transfer, secret storage, and budget
notifications/features. Free Tier eligibility depends on account age and plan.

## Destruction boundaries

Setting `deploy_application=false` removes only Lambda and API Gateway while
retaining the rest of the single-module environment. Full teardown is a
separate deliberate procedure performed only after state backup/export, data
and secret retention decisions, ECR review, and explicit owner confirmation.

Terraform may not be able to delete non-empty versioned buckets or ECR
repositories without destructive flags. Those flags remain disabled by default.
