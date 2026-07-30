# Documentation Index

## Purpose

These documents are the source of truth for the Fitness Tracker serverless
modernization. They record not only the intended design, but also why each
choice was made, what was rejected, and when a decision should be revisited.

## Scope

The documented target covers:

- AWS region `ap-south-1`
- environment `dev`
- API Gateway HTTP API
- Lambda container image
- Amazon ECR
- DynamoDB
- CloudWatch Logs
- S3 Terraform state
- GitHub Actions on GitHub-hosted runners
- GitHub OIDC for short-lived AWS credentials
- Terraform-managed infrastructure

The target explicitly excludes EKS, long-lived AWS access keys, NAT Gateway,
ALB, RDS, DocumentDB, continuously running ECS services, and mutable `latest`
image tags.

## Source baseline

Repository inspected:

- URL: `https://github.com/Elzabeth-L/Fitness_Tracker.git`
- branch: `master`
- commit: `469e68a732d2512aa05454d1c0975a41de0de62b`
- commit date: `2026-06-17`

The fork was reconstructed from GitHub's Git blob API because Git is not
installed locally and corporate filtering blocked GitHub archive downloads.
All findings refer to the immutable commit above. Install Git before committing
or pushing changes.

Compared with the earlier upstream inspection, this fork also contains an
existing GitHub Actions workflow, Azure Pipelines configuration, SonarCloud
configuration, Kubernetes Gateway API resources, and persistent-volume
manifests. They are legacy inputs to be reviewed and preserved or superseded;
they do not change the selected serverless target architecture.

## Documents

- [Architecture](architecture/README.md)
- [Infrastructure](infrastructure/README.md)
- [Security](security/README.md)
- [CI/CD](cicd/README.md)
- [Architectural decision log](decisions/README.md)
- [Implementation plan](implementation-plan/README.md)
- [Operations](operations/README.md)

## Documentation rules

1. A material architectural change requires an update to the decision log.
2. A phase cannot start until its entry criteria are satisfied.
3. Secrets, account credentials, tokens, and database connection strings must
   never be added to these files.
4. Examples must use placeholders rather than working credentials or account
   identifiers.
5. Terraform and workflow behavior described here must be verified by tests
   before it is treated as operational.
6. The repository commit inspected must be updated whenever analysis is
   repeated against newer source.

## Status vocabulary

- **Proposed**: agreed in principle but not implemented.
- **Accepted**: approved for implementation.
- **Implemented**: present and verified in source/infrastructure.
- **Superseded**: replaced by a later decision.
- **Blocked**: cannot proceed until a listed dependency is resolved.

All decisions are currently **Proposed** pending implementation approval.
