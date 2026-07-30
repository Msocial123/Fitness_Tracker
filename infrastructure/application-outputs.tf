output "api_url" {
  value = var.deploy_application ? "${aws_apigatewayv2_api.application[0].api_endpoint}/${aws_apigatewayv2_stage.dev[0].name}" : null
}

output "health_url" {
  value = var.deploy_application ? "${aws_apigatewayv2_api.application[0].api_endpoint}/${aws_apigatewayv2_stage.dev[0].name}/health" : null
}

output "lambda_function_name" {
  value = var.deploy_application ? aws_lambda_function.application[0].function_name : null
}

output "lambda_version" {
  value = var.deploy_application ? aws_lambda_function.application[0].version : null
}

output "deployed_image_uri" {
  value = var.deploy_application ? var.image_uri : null
}

output "dynamodb_table_names" {
  value = {
    users    = aws_dynamodb_table.users.name
    workouts = aws_dynamodb_table.workouts.name
    metrics  = aws_dynamodb_table.metrics.name
    plans    = aws_dynamodb_table.plans.name
  }
}
