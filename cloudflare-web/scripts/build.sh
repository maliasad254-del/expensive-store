#!/usr/bin/env bash
set -euo pipefail

echo "=== Expensive Store: Installing Dependencies & Building Production Bundle ==="
npm install
npm run typecheck
npm test
npm run build
echo "=== Build complete: dist/client is ready ==="
