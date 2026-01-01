# Optional: Configure S3 backend for remote state storage
# Uncomment and configure after creating the S3 bucket and DynamoDB table
#
# To set up:
# 1. Create S3 bucket:
#    aws s3 mb s3://sd-sim-terraform-state --region eu-west-1
# 2. Enable versioning:
#    aws s3api put-bucket-versioning --bucket sd-sim-terraform-state \
#      --versioning-configuration Status=Enabled
# 3. Create DynamoDB table:
#    aws dynamodb create-table \
#      --table-name sd-sim-terraform-locks \
#      --attribute-definitions AttributeName=LockID,AttributeType=S \
#      --key-schema AttributeName=LockID,KeyType=HASH \
#      --billing-mode PAY_PER_REQUEST \
#      --region eu-west-1
# 4. Uncomment the terraform block below and run: terraform init -migrate-state

# terraform {
#   backend "s3" {
#     bucket         = "sd-sim-terraform-state"
#     key            = "production/terraform.tfstate"
#     region         = "eu-west-1"
#     encrypt        = true
#     dynamodb_table = "sd-sim-terraform-locks"
#   }
# }
