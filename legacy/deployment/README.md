# Archived deployment assets

These files are retained for project history and learning only. They are not
part of the supported AWS serverless delivery path and must not be executed
without a separate review.

- `github-actions/` contains the superseded Docker Hub workflow.
- `pipelines/` contains the superseded Jenkins, Azure Pipelines, Ansible, and
  Sonar configuration.
- `kubernetes/` contains the superseded Kubernetes/Gateway API/storage files.

The maintained workflows are `.github/workflows/pr.yml` and
`.github/workflows/deploy-dev.yml`. The maintained infrastructure is under
`infrastructure/`.
