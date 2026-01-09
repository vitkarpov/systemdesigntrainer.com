# Connect to Production Database via SSH Tunnel

The bastion host is configured with public access for SSH tunneling to the RDS database.

## Quick Start

```bash
# Install if needed
pip install ec2instanceconnectcli

# Get details
cd terraform
RDS_ENDPOINT=$(terraform output -json | jq -r '.rds_endpoint.value' | cut -d: -f1)

# Connect with automatic key management
mssh -L 15432:$RDS_ENDPOINT:5432 ec2-user@i-07fac334f7ba40dcb -N
```
