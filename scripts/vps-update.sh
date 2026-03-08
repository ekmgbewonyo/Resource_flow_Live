#!/bin/bash
#
# ResourceFlow - VPS Update Script
# Deploys new commits to an existing Hostinger VPS.
# Use this after pushing changes - not for initial deployment.
#
# Usage:
#   source scripts/vps-deploy-config
#   ./scripts/vps-update.sh
#
# Or: VPS_HOST=1.2.3.4 ./scripts/vps-update.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

[ -f "$SCRIPT_DIR/vps-deploy-config" ] && source "$SCRIPT_DIR/vps-deploy-config"

if [ -z "$VPS_HOST" ]; then
  echo "❌ VPS_HOST not set. Run: source scripts/vps-deploy-config"
  exit 1
fi

VPS_USER="${VPS_USER:-root}"
VPS_PORT="${VPS_SSH_PORT:-22}"
REMOTE_PATH="/var/www/resourceflow"

echo "=============================================="
echo "  ResourceFlow - VPS Update"
echo "=============================================="
echo "  Target: $VPS_USER@$VPS_HOST:$REMOTE_PATH"
echo "=============================================="
echo ""

# Step 1: Build frontend
echo "📦 Building frontend..."
cd "$FRONTEND_DIR"
npm ci --silent 2>/dev/null || npm install --silent
npm run build
echo "   ✅ Frontend built"
echo ""

# Step 2: Upload to VPS
echo "📤 Uploading to VPS..."
rsync -avz --delete \
  -e "ssh -p $VPS_PORT -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'backend/.env' \
  --exclude 'backend/vendor' \
  --exclude 'backend/storage/logs/*' \
  --exclude 'backend/storage/framework/cache/*' \
  --exclude '.DS_Store' \
  "$ROOT_DIR/" "$VPS_USER@$VPS_HOST:$REMOTE_PATH/"

# Upload frontend dist (built locally)
rsync -avz -e "ssh -p $VPS_PORT -o StrictHostKeyChecking=no" \
  "$FRONTEND_DIR/dist/" "$VPS_USER@$VPS_HOST:$REMOTE_PATH/frontend/dist/"
echo "   ✅ Upload complete"
echo ""

# Step 3: Run backend update on VPS
echo "🔄 Updating backend on VPS..."
ssh -p "$VPS_PORT" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" \
  "cd $REMOTE_PATH/backend && composer install --no-dev --optimize-autoloader --no-interaction 2>/dev/null || true && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache && (supervisorctl restart resourceflow-worker:* 2>/dev/null || true)"
echo "   ✅ Backend updated"
echo ""

# Step 4: Fix permissions
echo "🔐 Setting permissions..."
ssh -p "$VPS_PORT" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" \
  "chown -R www-data:www-data $REMOTE_PATH && chmod -R 775 $REMOTE_PATH/backend/storage $REMOTE_PATH/backend/bootstrap/cache"
echo "   ✅ Done"
echo ""

echo "=============================================="
echo "  ✅ VPS update complete!"
echo "=============================================="
