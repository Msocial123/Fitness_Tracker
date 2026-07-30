resource "aws_lambda_function" "application" {
  count = var.deploy_application ? 1 : 0

  function_name = local.name_prefix
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = var.image_uri
  architectures = ["x86_64"]

  memory_size                    = var.lambda_memory_mb
  timeout                        = var.lambda_timeout_seconds
  reserved_concurrent_executions = var.lambda_reserved_concurrency
  publish                        = true

  environment {
    variables = {
      APP_ENV            = var.environment
      APP_VERSION        = regex("sha256:([0-9a-f]{64})$", var.image_uri)[0]
      COOKIE_SECURE      = "true"
      JWT_SECRET_ARN     = aws_secretsmanager_secret.jwt.arn
      NODE_ENV           = "production"
      USERS_TABLE        = aws_dynamodb_table.users.name
      WORKOUTS_TABLE     = aws_dynamodb_table.workouts.name
      METRICS_TABLE      = aws_dynamodb_table.metrics.name
      PLANS_TABLE        = aws_dynamodb_table.plans.name
      MONGODB_SECRET_ARN = aws_secretsmanager_secret.mongodb.arn
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
}

resource "aws_lambda_alias" "dev" {
  count = var.deploy_application ? 1 : 0

  name             = var.environment
  description      = "${var.environment} deployment alias"
  function_name    = aws_lambda_function.application[0].function_name
  function_version = aws_lambda_function.application[0].version
}
