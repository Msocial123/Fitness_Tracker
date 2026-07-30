output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "ecr_repository_name" {
  value = aws_ecr_repository.application.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.application.repository_url
}

output "github_plan_role_arn" {
  value = aws_iam_role.github_plan.arn
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "jwt_secret_arn" {
  value = aws_secretsmanager_secret.jwt.arn
}

output "mongodb_secret_arn" {
  value = aws_secretsmanager_secret.mongodb.arn
}
