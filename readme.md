# The Purple PiggyBank - Grand Central Station

<!-- TOC -->

- [The Purple PiggyBank - Grand Central Station](#the-purple-piggybank---grand-central-station)
  - [About](#about)
  - [Creating API Documentation](#creating-api-documentation)
    - [Installing docgen](#installing-docgen)
    - [Generate the api documents (pick markdown or html or both)](#generate-the-api-documents-pick-markdown-or-html-or-both)
  - [Deploying](#deploying)
    - [Initial deployment](#initial-deployment)
  - [Adding new lambdas](#adding-new-lambdas)
  - [Connecting to the database](#connecting-to-the-database)
  - [Seeding the database](#seeding-the-database)
    - [How to drop all tables from the database:](#how-to-drop-all-tables-from-the-database)
  - [Precommit - Update the terraform docs below:](#precommit---update-the-terraform-docs-below)
  - [Requirements](#requirements)
  - [Providers](#providers)
  - [Modules](#modules)
  - [Resources](#resources)
  - [Inputs](#inputs)
  - [Outputs](#outputs)

<!-- /TOC -->s](#resources)
  - [Inputs](#inputs)
  - [Outputs](#outputs)

<!-- /TOC -->

## About

This repository is a "hub" for all things The purple Piggy Bank's (TPPB for short) backend and infrastructure. It's structured as a monorepo and most operations will happen in either the `src/` or `lambdas.tf` locations. 

## Creating API Documentation

### Installing docgen

You must have docgen installed using the following commands:

```bash
curl https://raw.githubusercontent.com/thedevsaddam/docgen/v3/install.sh -o install.sh \
&& sudo chmod +x install.sh \
&& sudo ./install.sh \
&& rm install.sh
```

> See https://github.com/thedevsaddam/docgen for more details about docgen

### Generate the api documents (pick markdown or html or both)

Download the collection and environment.

```bash
docgen build -s -i TPPB.postman_collection.json -o ./apidocs.html  
docgen build -s -i TPPB.postman_collection.json -o ./apidocs.md -m
```

## Deploying

```bash
./build
terraform apply -var-file=./tfvars/dev.tfvars -auto-approve     
```

### Initial deployment

```bash
npm i
npx prisma generate
./build
terraform apply -var-file=./tfvars/dev.tfvars -auto-approve
# Connect to database locally
# update .env file to "local" temporarily
./prisma
```

## Adding new lambdas

Add new lambdas to lambdas.tf in the root directory. They should be post request and follow the same patterns as other lambdas for convention.
TODO: automate the api gateway deployment whenever adding a new lambda or more specifically when adding a new method 

## Connecting to the database

If you'd like to connect to the database, use the output command from terraform apply or look in outputs.tf for how to construct it.

Run the command, it will open a tunnel from local through the bastion host to the rds database. From there log in through pgadmin4. You can get the database credentials from secrets manager.

## Seeding the database

1. Open a connection to the database (see instructions in [Connecting to the database](#connecting-to-the-database))
2. Update .env file to "localhost" instead of the tppbdev/tppbprod endpoint
3. run `./prisma.sh`
4. This will seed the database.

> You may need to dump all tables first before seeding if the database already has been seeded. This is necessary when making development database schema.prisma changes.

### How to drop all tables from the database:

>❗️WARNING❗️**DO NOT** do this on tppbprod database!

```sql
DO $$
DECLARE
    r RECORD;
BEGIN
    -- This query fetches all table names in the 'public' schema of your database
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        -- Construct and execute a DROP TABLE statement for each table
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE;';
    END LOOP;
END $$;
```

## Precommit - Update the terraform docs below:

`pre-commit run -a`

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | ~> 1.6.5 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.42.0 |
| <a name="requirement_local"></a> [local](#requirement\_local) | ~> 2.5.1 |
| <a name="requirement_null"></a> [null](#requirement\_null) | ~> 3.2.2 |
| <a name="requirement_random"></a> [random](#requirement\_random) | ~> 3.6.1 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | ~> 5.42.0 |
| <a name="provider_random"></a> [random](#provider\_random) | ~> 3.6.1 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_lambdas"></a> [lambdas](#module\_lambdas) | ./modules/lambdas | n/a |

## Resources

| Name | Type |
|------|------|
| [aws_cognito_user_pool.cognito_user_pool](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool) | resource |
| [aws_cognito_user_pool_client.cognito_user_pool_client](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client) | resource |
| [aws_db_subnet_group.aurora_subnet_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group) | resource |
| [aws_eip.nat](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip) | resource |
| [aws_iam_policy.confirm_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.forgot_password_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_cognito_create_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_cognito_login_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_dynamodb_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_s3_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_sns_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_textract_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_instance.bastion](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance) | resource |
| [aws_internet_gateway.gw](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway) | resource |
| [aws_key_pair.bastion_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair) | resource |
| [aws_nat_gateway.nat_gw](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway) | resource |
| [aws_rds_cluster.aurora_cluster](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster) | resource |
| [aws_route_table.private](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table) | resource |
| [aws_route_table.public](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table) | resource |
| [aws_route_table_association.private1](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_route_table_association.private2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_route_table_association.public1](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_route_table_association.public2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_secretsmanager_secret.db_master_password](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) | resource |
| [aws_secretsmanager_secret_version.db_master_password_version](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version) | resource |
| [aws_security_group.aurora_sg](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group.bastion_sg](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group.lambda_sg](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group_rule.aurora_from_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [aws_security_group_rule.lambda_to_aurora](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [aws_subnet.private1](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet) | resource |
| [aws_subnet.private2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet) | resource |
| [aws_subnet.public1](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet) | resource |
| [aws_subnet.public2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet) | resource |
| [aws_vpc.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc) | resource |
| [random_password.master_password](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_domain_name"></a> [domain\_name](#input\_domain\_name) | domain name | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | environment | `string` | n/a | yes |
| <a name="input_zone_id"></a> [zone\_id](#input\_zone\_id) | hosted zone Id | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_tunnel_command"></a> [tunnel\_command](#output\_tunnel\_command) | run this before trying to connect with pgadmin |
<!-- END_TF_DOCS -->
