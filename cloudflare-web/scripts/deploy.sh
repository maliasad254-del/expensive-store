#!/usr/bin/env bash
set -euo pipefail

if grep -q "YOUR_D1_DATABASE_ID" wrangler.toml; then
  echo "ERROR: Please replace YOUR_D1_DATABASE_ID in wrangler.toml with your actual Cloudflare D1 database_id first."
  exit 1
fi

echo "=== 1. Building Frontend ==="
./scripts/build.sh

echo "=== 2. Applying Remote D1 Migrations ==="
npx wrangler d1 migrations apply expensive_store_db --remote

echo "=== 3. Deploying Worker & Static Assets to Cloudflare ==="
npx wrangler deploy

echo "=== Deployment Complete! ==="
echo "Next: Visit /admin/login on your deployed URL to create your first Admin account."
