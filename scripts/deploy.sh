#!/bin/bash
#
# ResourceFlow - Deployment Script
# Prepares backend and frontend for production deployment.
#
# Usage: ./scripts/deploy.sh [options]
#   --backend-only   Deploy backend only
#   --frontend-only  Deploy frontend only
#   --skip-db       Skip database migrate (use when DB is already set up)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_ONLY=false
FRONTEND_ONLY=false
SKIP_DB=false

for arg in "$@"; do
  case $arg in
    --backend-only)  BACKEND_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
    --skip-db)       SKIP_DB=true ;;
  esac
done

echo "=============================================="
echo "  ResourceFlow - Production Deployment"
echo "=============================================="
echo ""

# --- Backend ---
if [ "$FRONTEND_ONLY" = false ]; then
  echo "📦 Backend"
  cd "$BACKEND_DIR"

  if [ ! -f .env ]; then
    echo "❌ Error: backend/.env not found. Copy .env.example and configure."
    exit 1
  fi

  # Ensure APP_KEY exists
  if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
    echo "   Generating APP_KEY..."
    php artisan key:generate --force
  fi

  if [ "$SKIP_DB" = false ]; then
    echo "   Running migrations..."
    php artisan migrate --force
  fi

  echo "   Installing production dependencies..."
  composer install --optimize-autoloader --no-dev --no-interaction

  echo "   Caching config and routes..."
  php artisan config:cache
  php artisan route:cache

  echo "   Ensuring storage directories exist..."
  mkdir -p storage/app/public/{requests,verifications,donations,uploads}

  echo "   Linking storage..."
  php artisan storage:link 2>/dev/null || true

  echo "   ✅ Backend ready"
  echo ""
fi

# --- Frontend ---
if [ "$BACKEND_ONLY" = false ]; then
  echo "📦 Frontend"
  cd "$FRONTEND_DIR"

  if [ ! -f .env ]; then
    echo "⚠️  Warning: frontend/.env not found. Copy .env.example and set VITE_API_BASE_URL."
  fi

  echo "   Installing dependencies..."
  npm ci

  echo "   Building for production..."
  npm run build

  echo "   ✅ Frontend built → deploy frontend/dist/ to your static host"
  echo ""
fi

echo "=============================================="
echo "  ✅ Deployment preparation complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Deploy backend: upload backend/ to server, point web root to backend/public"
echo "  2. Deploy frontend: upload frontend/dist/ to static host"
echo "  3. Configure Paystack webhook: https://api.yourdomain.com/api/payments/paystack-webhook"
echo "  4. Ensure Supervisor runs: php artisan queue:work (if using queues)"
echo "  5. Configure cron: * * * * * cd backend && php artisan schedule:run >> /dev/null 2>&1"
echo "  6. Change Super Admin password after first login"
echo ""
