# Environment Variable Encryption with SOPS

This project uses [SOPS](https://github.com/getsops/sops) (Secrets OPerationS) with [age](https://github.com/FiloSottile/age) encryption to securely share environment variables between developers.

## Why SOPS?

- Encrypted `.env` files are committed to git
- Only encrypted values, keys remain visible (better for code review)
- No need for separate `.env.example` files
- Simple setup with age encryption (no cloud dependencies)

## Setup for New Developers

### 1. Install SOPS and age

```bash
brew install sops age
```

### 2. Get the age key from a team member

Ask a team member to securely share the `keys/age-key.txt` file with you. This file contains:
- A public key (safe to share)
- A secret key (keep this private!)

**IMPORTANT**: Never commit the `keys/` directory to git!

### 3. Place the key file

```bash
# Create the keys directory if it doesn't exist
mkdir -p keys

# Copy the age-key.txt file you received into keys/
# keys/age-key.txt
```

### 4. Decrypt the environment file

```bash
# Decrypt api/.env
export SOPS_AGE_KEY_FILE=$(pwd)/keys/age-key.txt
sops --decrypt --input-type dotenv --output-type dotenv api/.env.enc > api/.env
```

**Note**: `app/.env` is not encrypted as it only contains the API URL with no secrets.

**Tip**: Add this to your shell profile for convenience:
```bash
export SOPS_AGE_KEY_FILE="$HOME/Projects/sd-sim-2/keys/age-key.txt"
```

## Updating Environment Variables

### 1. Edit the plain .env file

```bash
# Make your changes
vim api/.env
```

### 2. Re-encrypt the file

```bash
export SOPS_AGE_KEY_FILE=$(pwd)/keys/age-key.txt
sops --encrypt --input-type dotenv --output-type dotenv api/.env > api/.env.enc
```

### 3. Commit only the encrypted file

```bash
git add api/.env.enc
git commit -m "Update API environment variables"
```

**IMPORTANT**: Never commit the plain `.env` files!

## Quick Commands

```bash
# Decrypt
export SOPS_AGE_KEY_FILE=$(pwd)/keys/age-key.txt
sops --decrypt --input-type dotenv --output-type dotenv api/.env.enc > api/.env

# Encrypt
export SOPS_AGE_KEY_FILE=$(pwd)/keys/age-key.txt
sops --encrypt --input-type dotenv --output-type dotenv api/.env > api/.env.enc
```
