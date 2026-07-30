resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.name_prefix}/jwt"
  description             = "JWT signing key for ${local.name_prefix}"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret" "mongodb" {
  name                    = "${local.name_prefix}/mongodb"
  description             = "Transitional MongoDB URI for ${local.name_prefix}; remove after DynamoDB cutover"
  recovery_window_in_days = 7
}

locals {
  runtime_secret_arns = [
    aws_secretsmanager_secret.jwt.arn,
    aws_secretsmanager_secret.mongodb.arn
  ]
}
