#!/usr/bin/env bash
# Run on the server after pulling new code so clients pick up the new SPA bundle.
# Example: git pull && bash scripts/bump-after-deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}/backend"
php artisan app:bump-deploy-version --no-interaction
