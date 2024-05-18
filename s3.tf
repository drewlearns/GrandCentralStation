resource "aws_s3_bucket" "receipts_bucket" {
  bucket = "tppb-receipts-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "tppb-receipts-bucket"
    Environment = "Production"
  }
}

resource "aws_s3_bucket_public_access_block" "receipts_bucket_public_access_block" {
  bucket = aws_s3_bucket.receipts_bucket.bucket

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


resource "aws_vpc_endpoint" "s3_endpoint" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"

  tags = {
    Name = "s3-vpc-endpoint"
  }
}
