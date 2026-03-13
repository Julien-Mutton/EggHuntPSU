#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Egg Hunt — First-Time Setup
#  Run this once to set up the entire project.
# ─────────────────────────────────────────────────────────
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo ""
echo "🥚  Egg Hunt — First-Time Setup"
echo "════════════════════════════════════════"

# ── 1. Check prerequisites ──────────────────────────────
echo ""
echo "▸ Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || { echo "❌ python3 is required but not installed."; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "❌ node is required but not installed."; exit 1; }
command -v npm     >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }
command -v psql    >/dev/null 2>&1 || { echo "❌ psql (PostgreSQL client) is required but not installed."; exit 1; }

echo "  ✓ python3, node, npm, psql found"

# ── 2. Create PostgreSQL database ───────────────────────
echo ""
echo "▸ Setting up PostgreSQL database..."

# Source backend .env for DB credentials
if [ -f "$ROOT_DIR/backend/.env" ]; then
  export $(grep -v '^#' "$ROOT_DIR/backend/.env" | xargs)
fi

DB_NAME="${DB_NAME:-egghunt}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Check if database already exists
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "  ⊘ Database '$DB_NAME' already exists, skipping"
else
  echo "  Creating database '$DB_NAME'..."
  PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null \
    && echo "  ✓ Database '$DB_NAME' created" \
    || { echo "  ⚠ Could not create database. Please create it manually:"; echo "    createdb -U $DB_USER $DB_NAME"; }
fi

# ── 3. Backend setup ────────────────────────────────────
echo ""
echo "▸ Setting up backend..."

cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv venv
fi

echo "  Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "  Running database migrations..."
python manage.py migrate --no-input

echo "  Seeding test data..."
python manage.py seed

deactivate
echo "  ✓ Backend ready"

# ── 4. Frontend setup ───────────────────────────────────
echo ""
echo "▸ Setting up frontend..."

cd "$ROOT_DIR/frontend"

echo "  Installing Node dependencies..."
npm install --silent

echo "  ✓ Frontend ready"

# ── Done ────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "🎉  Setup complete!"
echo ""
echo "  To start the app, run:  ./run.sh"
echo ""
echo "  Test accounts:"
echo "    admin   / admin123     (Admin)"
echo "    alice   / password123  (User)"
echo "    bob     / password123  (User)"
echo "    charlie / password123  (User)"
echo ""
