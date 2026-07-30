locals {
  state_object_arn = "${aws_s3_bucket.terraform_state.arn}/${var.terraform_state_key}"
  lock_object_arn  = "${local.state_object_arn}.tflock"
}

data "aws_iam_policy_document" "state_read" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.terraform_state.arn]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = [var.terraform_state_key, "${var.terraform_state_key}.tflock"]
    }
  }

  statement {
    actions   = ["s3:GetObject"]
    resources = [local.state_object_arn, local.lock_object_arn]
  }
}

data "aws_iam_policy_document" "state_read_with_lock" {
  source_policy_documents = [data.aws_iam_policy_document.state_read.json]

  # A read-only Terraform plan still acquires the native S3 lock. Permit the
  # plan role to mutate only the lock object, never the state object itself.
  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = [local.lock_object_arn]
  }
}

data "aws_iam_policy_document" "state_write" {
  source_policy_documents = [data.aws_iam_policy_document.state_read.json]

  statement {
    actions   = ["s3:PutObject"]
    resources = [local.state_object_arn, local.lock_object_arn]
  }

  statement {
    actions   = ["s3:DeleteObject"]
    resources = [local.lock_object_arn]
  }
}

data "aws_iam_policy_document" "plan" {
  source_policy_documents = [data.aws_iam_policy_document.state_read_with_lock.json]

  statement {
    actions = [
      "apigateway:GET",
      "budgets:ViewBudget",
      "dynamodb:DescribeTable",
      "dynamodb:ListTagsOfResource",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
      "ecr:GetLifecyclePolicy",
      "ecr:GetRepositoryPolicy",
      "ecr:ListTagsForResource",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:GetOpenIDConnectProvider",
      "iam:ListAttachedRolePolicies",
      "iam:ListOpenIDConnectProviderTags",
      "iam:ListRolePolicies",
      "lambda:GetAlias",
      "lambda:GetFunction",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetPolicy",
      "lambda:ListVersionsByFunction",
      "logs:DescribeLogGroups",
      "logs:ListTagsForResource",
      "s3:GetBucketLocation",
      "s3:GetBucketOwnershipControls",
      "s3:GetBucketPolicy",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetBucketTagging",
      "s3:GetBucketVersioning",
      "s3:GetEncryptionConfiguration",
      "s3:GetLifecycleConfiguration",
      "s3:ListBucket",
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:ListSecretVersionIds",
      "sts:GetCallerIdentity"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_plan" {
  name   = "${local.name_prefix}-terraform-plan"
  role   = aws_iam_role.github_plan.id
  policy = data.aws_iam_policy_document.plan.json
}

data "aws_iam_policy_document" "deploy" {
  source_policy_documents = [data.aws_iam_policy_document.state_write.json]

  statement {
    actions = [
      "apigateway:GET",
      "budgets:ViewBudget",
      "dynamodb:DescribeTable",
      "dynamodb:ListTagsOfResource",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
      "ecr:GetLifecyclePolicy",
      "ecr:GetRepositoryPolicy",
      "ecr:ListTagsForResource",
      "iam:GetOpenIDConnectProvider",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListOpenIDConnectProviderTags",
      "iam:ListRolePolicies",
      "lambda:GetAlias",
      "lambda:GetFunction",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetPolicy",
      "lambda:ListVersionsByFunction",
      "logs:DescribeLogGroups",
      "logs:ListTagsForResource",
      "s3:GetBucketLocation",
      "s3:GetBucketOwnershipControls",
      "s3:GetBucketPolicy",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetBucketTagging",
      "s3:GetBucketVersioning",
      "s3:GetEncryptionConfiguration",
      "s3:GetLifecycleConfiguration",
      "s3:ListBucket",
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:ListSecretVersionIds",
      "sts:GetCallerIdentity"
    ]
    resources = ["*"]
  }

  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:DescribeImageScanFindings",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:ListImages",
      "ecr:PutImage",
      "ecr:PutImageScanningConfiguration",
      "ecr:PutImageTagMutability",
      "ecr:PutLifecyclePolicy",
      "ecr:TagResource",
      "ecr:UntagResource",
      "ecr:UploadLayerPart"
    ]
    resources = [aws_ecr_repository.application.arn]
  }

  statement {
    actions = [
      "lambda:AddPermission",
      "lambda:CreateAlias",
      "lambda:CreateFunction",
      "lambda:DeleteAlias",
      "lambda:DeleteFunction",
      "lambda:GetAlias",
      "lambda:GetFunction",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetPolicy",
      "lambda:ListVersionsByFunction",
      "lambda:PublishVersion",
      "lambda:RemovePermission",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:UpdateAlias",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.name_prefix}*"]
  }

  statement {
    actions   = ["dynamodb:CreateTable", "dynamodb:DeleteTable", "dynamodb:DescribeTable", "dynamodb:TagResource", "dynamodb:UntagResource", "dynamodb:UpdateTable", "dynamodb:UpdateTimeToLive"]
    resources = ["arn:${data.aws_partition.current.partition}:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${local.name_prefix}*"]
  }

  statement {
    actions   = ["logs:CreateLogGroup", "logs:DeleteLogGroup", "logs:DescribeLogGroups", "logs:ListTagsForResource", "logs:PutRetentionPolicy", "logs:TagResource", "logs:UntagResource"]
    resources = ["arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/${local.name_prefix}*", "arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}*"]
  }

  statement {
    actions   = ["iam:CreateRole", "iam:DeleteRole", "iam:DeleteRolePolicy", "iam:GetRole", "iam:GetRolePolicy", "iam:ListAttachedRolePolicies", "iam:ListRolePolicies", "iam:PassRole", "iam:PutRolePolicy", "iam:TagRole", "iam:UntagRole", "iam:UpdateAssumeRolePolicy"]
    resources = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/${local.name_prefix}*"]
  }

  statement {
    actions   = ["apigateway:DELETE", "apigateway:GET", "apigateway:PATCH", "apigateway:POST", "apigateway:PUT"]
    resources = ["arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis*"]
  }

  statement {
    actions = [
      "budgets:ModifyBudget",
      "budgets:ViewBudget"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:budgets::${data.aws_caller_identity.current.account_id}:budget/${local.name_prefix}-monthly-cost"]
  }

  statement {
    actions = [
      "secretsmanager:DeleteSecret",
      "secretsmanager:DescribeSecret",
      "secretsmanager:TagResource",
      "secretsmanager:UntagResource",
      "secretsmanager:UpdateSecret"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${local.name_prefix}/*"]
  }

  statement {
    actions = [
      "iam:GetOpenIDConnectProvider",
      "iam:ListOpenIDConnectProviderTags",
      "iam:TagOpenIDConnectProvider",
      "iam:UntagOpenIDConnectProvider",
      "iam:UpdateOpenIDConnectProviderThumbprint"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"]
  }

  statement {
    actions   = ["sts:GetCallerIdentity"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${local.name_prefix}-terraform-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
