resource "aws_dynamodb_table" "tppb" {
  name           = "tppb"
  billing_mode   = "PROVISIONED"
  read_capacity  = 2
  write_capacity = 2
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }
  
  attribute {
    name = "userId" // Define 'userId' as it is used in GSI
    type = "S"
  }

  global_secondary_index {
    name            = "InvertedIndex"
    hash_key        = "SK"
    range_key       = "PK"
    projection_type = "ALL"
    read_capacity   = 2
    write_capacity  = 2
  }
  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId" // Use 'userId' as the hash key for the GSI
    projection_type = "ALL"    // Include all attributes in the index
    read_capacity   = 2        // Adjust based on your expected load
    write_capacity  = 2        // Adjust based on your expected load
  }
}

// Auto Scaling for Read Capacity
resource "aws_appautoscaling_target" "read_target" {
  max_capacity       = 7
  min_capacity       = 2
  resource_id        = "table/${aws_dynamodb_table.tppb.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "read_policy" {
  name               = "DynamoDBReadCapacityAutoscalingPolicy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.read_target.resource_id
  scalable_dimension = aws_appautoscaling_target.read_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.read_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70.0
  }
}

// Auto Scaling for Write Capacity
resource "aws_appautoscaling_target" "write_target" {
  max_capacity       = 7
  min_capacity       = 2
  resource_id        = "table/${aws_dynamodb_table.tppb.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "write_policy" {
  name               = "DynamoDBWriteCapacityAutoscalingPolicy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.write_target.resource_id
  scalable_dimension = aws_appautoscaling_target.write_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.write_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = 70.0
  }
}
