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
| [aws_iam_policy.cognito_ses_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.confirm_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.forgot_password_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_cognito_create_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_cognito_disable_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_cognito_login_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_invoke_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_s3_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_secrets_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_sns_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.lambda_textract_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.ses_send_email_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_role.cognito_user_pool_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy_attachment.cognito_ses_policy_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_instance.bastion](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance) | resource |
| [aws_internet_gateway.gw](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway) | resource |
| [aws_key_pair.bastion_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair) | resource |
| [aws_nat_gateway.nat_gw](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway) | resource |
| [aws_rds_cluster.aurora_cluster](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster) | resource |
| [aws_rds_cluster_instance.aurora_instance](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance) | resource |
| [aws_route_table.private](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table) | resource |
| [aws_route_table.public](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table) | resource |
| [aws_route_table_association.private1](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_route_table_association.private2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_route_table_association.public1](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_route_table_association.public2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_s3_bucket.receipts_bucket](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket) | resource |
| [aws_s3_bucket_public_access_block.receipts_bucket_public_access_block](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block) | resource |
| [aws_secretsmanager_secret.db_master_password](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) | resource |
| [aws_secretsmanager_secret_version.db_master_password_version](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version) | resource |
| [aws_security_group.aurora_sg](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group.bastion_sg](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group.lambda_sg](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group_rule.aurora_from_bastion](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [aws_security_group_rule.aurora_from_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [aws_security_group_rule.bastion_to_aurora](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [aws_security_group_rule.lambda_to_aurora](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [aws_subnet.private1](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet) | resource |
| [aws_subnet.private2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet) | resource |
| [aws_subnet.public1](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet) | resource |
| [aws_subnet.public2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet) | resource |
| [aws_vpc.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc) | resource |
| [aws_vpc_endpoint.s3_endpoint](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint) | resource |
| [random_password.master_password](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_iam_policy_document.assume_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_secretsmanager_secret.zoho](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret) | data source |
| [aws_secretsmanager_secret_version.zoho_version](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_domain_name"></a> [domain\_name](#input\_domain\_name) | domain name | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | environment | `string` | n/a | yes |
| <a name="input_max_capacity"></a> [max\_capacity](#input\_max\_capacity) | max capacity of instances for rds serverless v2 scaling configuration | `number` | `1` | no |
| <a name="input_region"></a> [region](#input\_region) | The AWS region to create resources in. | `string` | `"us-east-1"` | no |
| <a name="input_zone_id"></a> [zone\_id](#input\_zone\_id) | hosted zone Id | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_tunnel_command"></a> [tunnel\_command](#output\_tunnel\_command) | run this before trying to connect with pgadmin |
<!-- END_TF_DOCS -->

# STRIPEWEBHOOK
Step-by-Step Guide to Configure API Gateway
Create a New API or Use an Existing One:

Go to the API Gateway console.
Create a new API or select an existing one.
Create a Resource and Method:

Create a new resource if you don't already have one.
Add a method (e.g., POST) to the resource.
Integration Request Setup:

In the Method Execution page, click on the Integration Request.
Ensure that the Integration type is set to Lambda Function.
Check the box for Use Lambda Proxy integration.
Mapping Template Configuration:

Click on Mapping Templates.
Add a new mapping template for application/json.
In the template input box, use the following code to ensure the raw body is passed as-is:

```json
#set($inputRoot = $input.path('$'))
{
  "body": "$util.escapeJavaScript($input.body).replaceAll("\\'", "'")",
  "headers": {
    #foreach($header in $input.params().header.keySet())
    "$header": "$util.escapeJavaScript($input.params().header.get($header))"
    #if($foreach.hasNext),#end
    #end
  },
  "queryStringParameters": {
    #foreach($queryParam in $input.params().querystring.keySet())
    "$queryParam": "$util.escapeJavaScript($input.params().querystring.get($queryParam))"
    #if($foreach.hasNext),#end
    #end
  },
  "pathParameters": {
    #foreach($pathParam in $input.params().path.keySet())
    "$pathParam": "$util.escapeJavaScript($input.params().path.get($pathParam))"
    #if($foreach.hasNext),#end
    #end
  },
  "stageVariables": {
    #foreach($stageVariable in $stageVariables.keySet())
    "$stageVariable": "$util.escapeJavaScript($stageVariables.get($stageVariable))"
    #if($foreach.hasNext),#end
    #end
  },
  "requestContext": {
    "accountId": "$context.identity.accountId",
    "resourceId": "$context.resourceId",
    "stage": "$context.stage",
    "requestId": "$context.requestId",
    "identity": {
      "cognitoIdentityPoolId": "$context.identity.cognitoIdentityPoolId",
      "accountId": "$context.identity.accountId",
      "cognitoIdentityId": "$context.identity.cognitoIdentityId",
      "caller": "$context.identity.caller",
      "sourceIp": "$context.identity.sourceIp",
      "principalOrgId": "$context.identity.principalOrgId",
      "accessKey": "$context.identity.accessKey",
      "cognitoAuthenticationType": "$context.identity.cognitoAuthenticationType",
      "cognitoAuthenticationProvider": "$context.identity.cognitoAuthenticationProvider",
      "userArn": "$context.identity.userArn",
      "userAgent": "$context.identity.userAgent",
      "user": "$context.identity.user"
    },
    "resourcePath": "$context.resourcePath",
    "httpMethod": "$context.httpMethod",
    "apiId": "$context.apiId"
  }
}
```


To ensure that the keystore key is correctly generated and matches the upload certificate from Google Play, you'll need to follow these steps:

Download the Upload Certificate from Google Play:

Go to the Google Play Console.
Navigate to Release > Setup > App Signing.
Under "App signing key certificate" and "Upload key certificate," you should see the option to download the certificate.
Generate a Keystore Using the Upload Certificate:
Unfortunately, you can't directly create a keystore using the certificate file (PEM format) from Google. However, you can import the certificate into a new keystore.

Let's break this process down:

a. Convert the PEM Certificate to a PKCS12 (PFX) File:
If you have the .pem certificate file, you need to convert it to a .pfx (PKCS12) file.

If you do not have the private key, you cannot directly convert it to a .pfx. The upload certificate provided by Google Play is used to verify your upload key, but it does not contain the private key necessary to sign the app.

However, you can create a new keystore and then generate a new certificate from this keystore. Here's the process:

b. Generate a New Keystore and Key Pair:
If you do not have the original upload key, you need to generate a new one. Here is how you can generate a new keystore:

bash
Copy code
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
Follow the prompts to enter the necessary information (passwords, etc.).

c. Export the Certificate from the New Keystore:
After creating the new keystore, you can export the certificate to compare it:

bash
Copy code
keytool -export -alias upload -keystore upload-keystore.jks -file upload_certificate.pem
Compare the Certificates:
Compare the SHA1 fingerprint of the newly generated certificate with the one provided by Google Play to ensure they match.

bash
Copy code
keytool -list -v -keystore upload-keystore.jks -alias upload
The output will include the SHA1 fingerprint, which should match the fingerprint of the upload certificate on Google Play.

Use the Correct Keystore in Your Project:
Ensure the key.properties file points to the correct keystore.

properties
Copy code
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=upload
storeFile=/Users/drewk/development/bullet-train/upload-keystore.jks
Updated build.gradle File:
Ensure your build.gradle file correctly references the keystore properties:

groovy
Copy code
plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}

def localProperties = new Properties()
def localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {
    localPropertiesFile.withReader('UTF-8') { reader ->
        localProperties.load(reader)
    }
}

def flutterVersionCode = localProperties.getProperty('flutter.versionCode')
if (flutterVersionCode == null) {
    flutterVersionCode = '1'
}

def flutterVersionName = localProperties.getProperty('flutter.versionName')
if (flutterVersionName == null) {
    flutterVersionName = '1.0'
}

def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
} else {
    println "Keystore file not found at ${keystorePropertiesFile}"
}

android {
    compileSdkVersion 34

    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }

    lintOptions {
        disable 'InvalidPackage'
        checkReleaseBuilds false
    }

    defaultConfig {
        applicationId "com.thepurplepiggybank.app"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
    }

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

flutter {
    source '../..'
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.7.10"
}
Clean and Rebuild the Project
Clean the Project:

bash
Copy code
./gradlew clean
Rebuild the App Bundle:

bash
Copy code
flutter build appbundle --release
By following these steps, you should be able to ensure that your keystore and key match the upload certificate requirements for Google Play. If you still face issues, please provide specific details or error messages, and we'll continue troubleshooting further.


Version code 4 has already been used. Try another version code.
You uploaded an app bundle that is signed with an upload certificate that is not yet valid because it has been recently reset. You will be able to upload app bundles again from Jun 21, 2024, 4:04:22 PM UTC.


It looks like there are two distinct issues you're encountering:

Version Code Conflict: The version code you are using has already been used. You need to increment the version code.
Upload Certificate Validity: The upload certificate is not yet valid due to a recent reset.
Resolving Version Code Conflict
To resolve the version code conflict, increment the version code in your build.gradle file. Here's how:

Open build.gradle:
Update the defaultConfig section to increment the version code. For example, if your current version code is 4, change it to 5:

groovy
Copy code
defaultConfig {
    applicationId "com.thepurplepiggybank.app"
    minSdkVersion 21
    targetSdkVersion 34
    versionCode 5  // Incremented version code
    versionName flutterVersionName
}
Alternatively, if you manage these values in your local.properties file, update them there.

Handling Upload Certificate Validity
The upload certificate error indicates that your certificate has recently been reset, and it will be valid from a specific date and time (June 21, 2024, 4:04:22 PM UTC). This means you need to wait until the specified time before you can successfully upload the new app bundle.

Steps to Proceed:
Update the Version Code:
Increment the version code in your build.gradle file as shown above.

Wait Until the Certificate is Valid:
You will need to wait until June 21, 2024, 4:04:22 PM UTC for the upload certificate to become valid. Unfortunately, there isn't a way to bypass this waiting period if Google Play Console has imposed it.

Example build.gradle File with Updated Version Code:
groovy
Copy code
plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}

def localProperties = new Properties()
def localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {
    localPropertiesFile.withReader('UTF-8') { reader ->
        localProperties.load(reader)
    }
}

def flutterVersionCode = localProperties.getProperty('flutter.versionCode')
if (flutterVersionCode == null) {
    flutterVersionCode = '1'
}

def flutterVersionName = localProperties.getProperty('flutter.versionName')
if (flutterVersionName == null) {
    flutterVersionName = '1.0'
}

def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
} else {
    println "Keystore file not found at ${keystorePropertiesFile}"
}

android {
    compileSdkVersion 34

    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }

    lintOptions {
        disable 'InvalidPackage'
        checkReleaseBuilds false
    }

    defaultConfig {
        applicationId "com.thepurplepiggybank.app"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode flutterVersionCode.toInteger() + 1  // Incremented version code
        versionName flutterVersionName
    }

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

flutter {
    source '../..'
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.7.10"
}
Clean and Rebuild the Project
Clean the Project:

bash
Copy code
./gradlew clean
Rebuild the App Bundle:

bash
Copy code
flutter build appbundle --release
Upload the App Bundle
Once the certificate becomes valid, you can upload the new app bundle to the Google Play Console.

By following these steps, you should be able to resolve the version code conflict and wait for the upload certificate to become valid. If you have any further questions or issues, feel free to ask.






