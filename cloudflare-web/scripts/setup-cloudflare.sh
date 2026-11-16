#!/usr/bin/env bash
set -euo pipefail

echo "=== Expensive Store: Cloudflare Resource Provisioning ==="
echo "1. Checking Wrangler login..."
npx wrangler whoami || {
  echo "You are not logged in. Opening Cloudflare browser login..."
  npx wrangler login
}

echo "2. Creating D1 database 'expensive_store_db' (if not created)..."
npx wrangler d1 create expensive_store_db || true

echo "3. Creating R2 bucket 'expensive-store-images' (if not created)..."
npx wrangler r2 bucket create expensive-store-images || true

echo ""
echo "IMPORTANT NEXT STEP:"
echo "Copy the database_id printed above into wrangler.toml replacing YOUR_D1_DATABASE_ID,"
echo "then run: ./scripts/deploy.sh"
