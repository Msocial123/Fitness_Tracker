variable "aws_region" {
  description = "AWS region for all application resources."
  type        = string
  default     = "ap-south-1"
}

variable "application_name" {
  type    = string
  default = "fitness-tracker"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "github_owner" {
  type    = string
  default = "Elzabeth-L"
}

variable "github_repository" {
  type    = string
  default = "Fitness_Tracker"
}

variable "deployment_branch" {
  type    = string
  default = "master"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name used for Terraform state."
  type        = string

  validation {
    condition     = length(var.state_bucket_name) >= 3 && length(var.state_bucket_name) <= 63
    error_message = "state_bucket_name must be a valid S3 bucket name length."
  }
}

variable "terraform_state_key" {
  description = "Single state key for all foundational and application resources."
  type        = string
  default     = "fitness-tracker/terraform.tfstate"
}

variable "budget_notification_email" {
  description = "Email address that receives AWS Budget notifications."
  type        = string
}

variable "monthly_budget_usd" {
  type    = number
  default = 5

  validation {
    condition     = var.monthly_budget_usd > 0
    error_message = "monthly_budget_usd must be greater than zero."
  }
}
