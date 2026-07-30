resource "aws_apigatewayv2_api" "application" {
  count = var.deploy_application ? 1 : 0

  name          = local.name_prefix
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "application" {
  count = var.deploy_application ? 1 : 0

  api_id                 = aws_apigatewayv2_api.application[0].id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_alias.dev[0].invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_route" "default" {
  count = var.deploy_application ? 1 : 0

  api_id    = aws_apigatewayv2_api.application[0].id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.application[0].id}"
}

resource "aws_apigatewayv2_stage" "dev" {
  count = var.deploy_application ? 1 : 0

  api_id      = aws_apigatewayv2_api.application[0].id
  name        = var.environment
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = false
    throttling_burst_limit   = var.api_throttling_burst_limit
    throttling_rate_limit    = var.api_throttling_rate_limit
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId          = "$context.requestId"
      routeKey           = "$context.routeKey"
      status             = "$context.status"
      responseLength     = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
    })
  }
}

resource "aws_lambda_permission" "api" {
  count = var.deploy_application ? 1 : 0

  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.application[0].function_name
  qualifier     = aws_lambda_alias.dev[0].name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.application[0].execution_arn}/*/*"
}
