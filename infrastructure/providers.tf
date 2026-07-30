provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  name_prefix = "${var.application_name}-${var.environment}"
  repository  = "${var.github_owner}/${var.github_repository}"
  common_tags = {
    Application = var.application_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Repository  = local.repository
    CostCenter  = "learning"
  }
}
