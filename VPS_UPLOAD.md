# ResourceFlow — Hostinger VPS Upload & Deployment

Single reference for deploying ResourceFlow on Hostinger VPS.

---

## Updating Existing Deployment (Project Already Hosted)

Use this flow when pushing updates to an already-running VPS. **Do not** run `migrate:fresh --seed` — it would wipe production data.

### 1. Upload Changed Files

From your machine (replace paths as needed):

```bash
# Upload backend and frontend (excludes vendor, node_modules, .env)
scp -r backend frontend scripts root@YOUR_VPS_IP:/var/www/resourceflow/
```

Or with Git on the VPS:

```bash
ssh root@YOUR_VPS_IP
cd /var/www/resourceflow
git pull origin main   # or your branch
```

### 2. Backend Update (on VPS)

```bash
cd /var/www/resourceflow/backend

# Keep existing .env — do NOT overwrite
composer install --no-dev --optimize-autoloader
php artisan migrate --force          # Run new migrations only (no fresh, no seed)
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Ensure storage dirs exist
mkdir -p storage/app/public/{requests,verifications,donations,uploads}
chown -R www-data:www-data /var/www/resourceflow
chmod -R 775 storage bootstrap/cache
```

### 3. Frontend Update (on VPS)

```bash
cd /var/www/resourceflow/frontend

# Keep existing .env
npm ci
npm run build
```

### 4. Restart Services

```bash
supervisorctl restart resourceflow-worker:*
# Nginx/PHP-FPM usually need no restart for code changes
```

### 5. Verify

```bash
curl https://api.yourdomain.com/api/health
```

---

## Fresh Deployment (New VPS)

Use the sections below only for a **new** server where ResourceFlow is not yet installed.

---

## 1. What to Upload

Upload only these folders/files to your VPS:

| Path | Purpose |
|------|---------|
| `backend/` | Laravel API (exclude `vendor/`, `node_modules/`, `.env` — create `.env` on server) |
| `frontend/` | React SPA (exclude `node_modules/`, `dist/` — build on server) |
| `scripts/` | deploy.sh, pre-deploy-check.sh, setup-database.sh |

**Exclude from upload:** `.env`, `vendor/`, `node_modules/`, `dist/`, `.git/`, `._*`, `.DS_Store`, `*.log`

---

## 2. Server Requirements

| Requirement | Version |
|-------------|---------|
| OS | Ubuntu 22.04 LTS |
| PHP | 8.2+ (pgsql, mbstring, xml, curl, zip, gd, bcmath) |
| Database | PostgreSQL 14+ |
| Web Server | Nginx |
| Node.js | 18+ (for frontend build) |
| RAM | 2 GB minimum |

---

## 3. One-Time Server Setup (if fresh VPS)

```bash
# Connect
ssh root@YOUR_VPS_IP

# Update
apt update && apt upgrade -y

# PHP 8.2
apt install -y software-properties-common
add-apt-repository -y ppa:ondrej/php
apt update
apt install -y php8.2-fpm php8.2-cli php8.2-pgsql php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-bcmath

# Nginx, PostgreSQL, Composer, Node.js, Git
apt install -y nginx postgresql postgresql-contrib
curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt install -y nodejs
apt install -y git

# Firewall
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

---

## 4. Create Database

```bash
sudo -u postgres psql
CREATE DATABASE resourceflow;
CREATE USER resourceflow_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE resourceflow TO resourceflow_user;
\c resourceflow
GRANT ALL ON SCHEMA public TO resourceflow_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO resourceflow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO resourceflow_user;
\q
```

---

## 5. Upload Project

**Option A — SCP (from your machine):**
```bash
scp -r backend frontend scripts root@YOUR_VPS_IP:/var/www/resourceflow/
```

**Option B — Git:**
```bash
cd /var/www
git clone YOUR_REPO_URL resourceflow
```

---

## 6. Backend Setup (Fresh Install Only)

```bash
cd /var/www/resourceflow/backend

# Create .env from template
cp .env.production.example .env
nano .env   # Configure all values (see Section 9)

# Install & deploy
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate:fresh --seed --force   # Wipes DB — use only for fresh install!
php artisan storage:link
php artisan config:cache
php artisan route:cache

# Storage dirs
mkdir -p storage/app/public/{requests,verifications,donations,uploads}
chown -R www-data:www-data /var/www/resourceflow
chmod -R 775 storage bootstrap/cache
```

---

## 7. Frontend Setup

```bash
cd /var/www/resourceflow/frontend

cp .env.example .env
nano .env   # Set VITE_API_BASE_URL, VITE_PAYSTACK_PUBLIC_KEY

npm ci
npm run build
```

---

## 8. Nginx Configuration

**API** — `/etc/nginx/sites-available/resourceflow-api`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /var/www/resourceflow/backend/public;
    index index.php;
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

**Frontend** — `/etc/nginx/sites-available/resourceflow-frontend`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/resourceflow/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

```bash
ln -sf /etc/nginx/sites-available/resourceflow-api /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/resourceflow-frontend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 9. Backend .env (Production)

| Variable | Value |
|----------|-------|
| APP_ENV | production |
| APP_DEBUG | false |
| APP_URL | https://api.yourdomain.com |
| FRONTEND_URL | https://yourdomain.com |
| SANCTUM_STATEFUL_DOMAINS | yourdomain.com,www.yourdomain.com |
| DB_CONNECTION | pgsql |
| DB_HOST | 127.0.0.1 |
| DB_DATABASE | resourceflow |
| DB_USERNAME | resourceflow_user |
| DB_PASSWORD | (from Step 4) |
| PAYSTACK_PUBLIC_KEY | pk_live_... |
| PAYSTACK_SECRET_KEY | sk_live_... |
| QOREID_CLIENT_ID | (your value) |
| QOREID_SECRET | (your value) |
| MAIL_HOST | smtp.hostinger.com |
| MAIL_PORT | 587 |
| MAIL_ENCRYPTION | tls |

---

## 10. SSL (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.yourdomain.com -d yourdomain.com -d www.yourdomain.com -m your@email.com --agree-tos --non-interactive
```

---

## 11. Background Services

**Supervisor** (queue worker):
```bash
apt install -y supervisor
cat > /etc/supervisor/conf.d/resourceflow-worker.conf << 'EOF'
[program:resourceflow-worker]
command=php /var/www/resourceflow/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
directory=/var/www/resourceflow/backend
autostart=true
autorestart=true
user=www-data
EOF
supervisorctl reread && supervisorctl update && supervisorctl start resourceflow-worker:*
```

**Cron** (scheduler):
```bash
crontab -e
# Add: * * * * * cd /var/www/resourceflow/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 12. Post-Deploy

1. **DNS**: Add A records for @, www, api → VPS IP
2. **Paystack webhook**: `https://api.yourdomain.com/api/payments/paystack-webhook`
3. **Change passwords**: Super Admin `superadmin@resourceflow.com` / Auditor `auditor@resourceflow.com` — default: `svc_r3f70w-J3TM3ga`
4. **Verify**: `curl https://api.yourdomain.com/api/health`

---

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@resourceflow.com | svc_r3f70w-J3TM3ga |
| Auditor | auditor@resourceflow.com | svc_r3f70w-J3TM3ga |

**Change immediately after first login.**

---

## Optional: Automated Script

For automated VPS setup, use `scripts/vps-deploy-remote.sh` on the server. Set env vars (`DB_PASSWORD`, `PAYSTACK_*`, `QOREID_*`, etc.) before running. See script header for details.
