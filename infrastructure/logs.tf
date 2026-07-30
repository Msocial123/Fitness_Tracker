resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name_prefix}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/${local.name_prefix}/api-access"
  retention_in_days = var.log_retention_days
}
