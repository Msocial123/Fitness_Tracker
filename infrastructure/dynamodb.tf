resource "aws_dynamodb_table" "users" {
  name           = "${local.name_prefix}-users"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "email"

  attribute {
    name = "email"
    type = "S"
  }
}

resource "aws_dynamodb_table" "workouts" {
  name           = "${local.name_prefix}-workouts"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "userEmail"
  range_key      = "recordKey"

  attribute {
    name = "userEmail"
    type = "S"
  }

  attribute {
    name = "recordKey"
    type = "S"
  }
}

resource "aws_dynamodb_table" "metrics" {
  name           = "${local.name_prefix}-metrics"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "userEmail"
  range_key      = "recordKey"

  attribute {
    name = "userEmail"
    type = "S"
  }

  attribute {
    name = "recordKey"
    type = "S"
  }
}

resource "aws_dynamodb_table" "plans" {
  name           = "${local.name_prefix}-plans"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "planId"

  attribute {
    name = "planId"
    type = "S"
  }

  attribute {
    name = "trainerEmail"
    type = "S"
  }

  attribute {
    name = "trainerRecordKey"
    type = "S"
  }

  global_secondary_index {
    name            = "trainer-created-index"
    hash_key        = "trainerEmail"
    range_key       = "trainerRecordKey"
    projection_type = "ALL"
    read_capacity   = 1
    write_capacity  = 1
  }
}
