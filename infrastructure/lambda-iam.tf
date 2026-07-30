data "aws_iam_policy_document" "lambda_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.name_prefix}-lambda-execution"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "lambda" {
  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  statement {
    actions = [
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem"
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      aws_dynamodb_table.workouts.arn,
      aws_dynamodb_table.metrics.arn,
      aws_dynamodb_table.plans.arn,
      "${aws_dynamodb_table.plans.arn}/index/trainer-created-index"
    ]
  }

  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = local.runtime_secret_arns
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "${local.name_prefix}-runtime"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}
