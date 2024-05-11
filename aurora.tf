# Aurora PostgreSQL Database
resource "aws_rds_cluster" "aurora_cluster" {
  cluster_identifier = "aurora-cluster-demo"
  engine             = "aurora-postgresql"
  engine_version     = "14.7"
  database_name      = "tppb"
  master_username    = "root"
  master_password    = "rootroot" # TODO: UPDATE THIS TO MORE SECURE
  skip_final_snapshot = true
  # TODO: Make this serverless
  vpc_security_group_ids = [aws_security_group.aurora_sg.id]
  db_subnet_group_name = aws_db_subnet_group.aurora_subnet_group.name
}

resource "aws_rds_cluster_instance" "aurora_instance" {
  identifier         = "aurora-instance-1"
  cluster_identifier = aws_rds_cluster.aurora_cluster.id
  instance_class     = "db.r5.large"
  engine             = "aurora-postgresql"
  engine_version     = "14.7"
}

resource "aws_db_subnet_group" "aurora_subnet_group" {
  name       = "aurora-subnet-group"
  subnet_ids = [aws_subnet.private1.id, aws_subnet.private2.id]
}