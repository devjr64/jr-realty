#!/bin/bash
# VPS one-time setup for JR Realty production deploy (non-Docker).
# Run this script once on the VPS as root or a user with sudo privileges.
# It installs Node.js 24, PostgreSQL 16, pm2, creates the database,
# sets up the deploy user, clones the repo, and configures pm2.

set -e

PUBLIC_KEY="${1:-}"
USER="deploy-jrrealty"
DEPLOY_PATH="/opt/jr-realty"
REPO="https://github.com/devjr64/jr-realty.git"
DB_NAME="jrrealty"
DB_USER="jrrealty"

if [ -z "$PUBLIC_KEY" ]; then
  echo "Usage: $0 'ssh-ed25519 AAAAC3...'"
  echo ""
  echo "Pass the SSH public key that GitHub Actions will use to deploy."
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root or with sudo."
  exit 1
fi

# -----------------------------------------------------------------------------
# Install Node.js 24
# -----------------------------------------------------------------------------
echo "Installing Node.js 24..."
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
echo "Node.js $(node --version) installed."

# -----------------------------------------------------------------------------
# Install pnpm
# -----------------------------------------------------------------------------
echo "Installing pnpm..."
npm install -g pnpm@11.20.0
echo "pnpm $(pnpm --version) installed."

# -----------------------------------------------------------------------------
# Install PostgreSQL 16
# -----------------------------------------------------------------------------
echo "Installing PostgreSQL 16..."
apt-get install -y postgresql postgresql-contrib
echo "PostgreSQL installed."

# -----------------------------------------------------------------------------
# Install pm2
# -----------------------------------------------------------------------------
echo "Installing pm2..."
npm install -g pm2
echo "pm2 $(pm2 --version) installed."

# -----------------------------------------------------------------------------
# Create deploy user
# -----------------------------------------------------------------------------
if id "$USER" &>/dev/null; then
  echo "User $USER already exists."
else
  useradd --create-home --shell /bin/bash "$USER"
  echo "Created user $USER."
fi

# -----------------------------------------------------------------------------
# Create deploy directory and clone repo
# -----------------------------------------------------------------------------
mkdir -p "$DEPLOY_PATH"
chown "$USER:$USER" "$DEPLOY_PATH"

if [ -d "$DEPLOY_PATH/.git" ]; then
  echo "Repo already exists at $DEPLOY_PATH."
else
  sudo -u "$USER" git clone "$REPO" "$DEPLOY_PATH"
  echo "Cloned repo to $DEPLOY_PATH."
fi

# -----------------------------------------------------------------------------
# Install deploy SSH key
# -----------------------------------------------------------------------------
sudo -u "$USER" mkdir -p "/home/$USER/.ssh"
sudo -u "$USER" chmod 700 "/home/$USER/.ssh"
echo "$PUBLIC_KEY" > "/home/$USER/.ssh/authorized_keys"
sudo -u "$USER" chmod 600 "/home/$USER/.ssh/authorized_keys"
echo "Installed deploy SSH public key for $USER."

# -----------------------------------------------------------------------------
# Create production .env template
# -----------------------------------------------------------------------------
ENV_FILE="$DEPLOY_PATH/.env"
if [ -f "$ENV_FILE" ]; then
  echo ".env already exists at $ENV_FILE."
else
  sudo -u "$USER" tee "$ENV_FILE" > /dev/null <<'EOF'
# =============================================================================
# JR Realty — Production Environment
# =============================================================================
# Replace all CHANGE_ME values before the first deploy.
# This file lives only on the VPS and is never committed to GitHub.

# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------
DATABASE_URL="postgresql://jrrealty:CHANGE_ME_PASSWORD@localhost:5432/jrrealty?schema=public"

# -----------------------------------------------------------------------------
# Auth (NextAuth.js v5)
# Generate a strong secret with: openssl rand -base64 32
# -----------------------------------------------------------------------------
AUTH_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL
AUTH_URL="https://jrrealty.com"
NEXT_PUBLIC_APP_URL="https://jrrealty.com"

# -----------------------------------------------------------------------------
# Email (Resend) — optional until contact forms need to send email
# -----------------------------------------------------------------------------
RESEND_API_KEY=""
EMAIL_FROM="JR Realty <noreply@jrrealty.com>"

# -----------------------------------------------------------------------------
# Phase 2 optional integrations
# -----------------------------------------------------------------------------
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
UPLOADTHING_TOKEN=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
EOF
  echo "Created .env template at $ENV_FILE."
  echo ""
  echo "IMPORTANT: Edit $ENV_FILE and replace all CHANGE_ME values before deploying."
fi

# -----------------------------------------------------------------------------
# Create database and user
# -----------------------------------------------------------------------------
echo "Creating PostgreSQL database and user..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD 'CHANGE_ME_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo "Database $DB_NAME created with user $DB_USER."
echo ""
echo "IMPORTANT: Update the password in $ENV_FILE to match the database password."

# -----------------------------------------------------------------------------
# Set up pm2 to auto-start on boot
# -----------------------------------------------------------------------------
echo "Setting up pm2 startup..."
pm2 startup
echo "pm2 will auto-start on boot."

echo ""
echo "============================================================================="
echo "VPS setup complete."
echo "============================================================================="
echo ""
echo "Next steps:"
echo "1. Edit the environment file: sudo nano $ENV_FILE"
echo "2. Update the database password in $ENV_FILE"
echo "3. Generate AUTH_SECRET: openssl rand -base64 32"
echo "4. Install dependencies and build:"
echo "   cd $DEPLOY_PATH"
echo "   sudo -u $USER pnpm install --frozen-lockfile"
echo "   sudo -u $USER pnpm run build"
echo "5. Start the app with pm2:"
echo "   sudo -u $USER pm2 start ecosystem.config.js"
echo "   sudo -u $USER pm2 save"
echo ""
echo "After that, every push to main on GitHub will deploy automatically."
echo ""
echo "To seed production with only the super admin (no demo data):"
echo "   cd $DEPLOY_PATH"
echo "   sudo -u $USER SEED_DEMO_DATA=false SEED_ADMIN_EMAIL=admin@jrrealty.com SEED_ADMIN_PASSWORD=YOUR_PASSWORD pnpm exec tsx prisma/seed.ts"
