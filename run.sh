#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Egg Hunt — Run Development Servers
#  Opens two separate terminals: one for backend, one for frontend.
# ─────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🥚  Egg Hunt — Launching Development Servers"
echo "════════════════════════════════════════"

# ── Start Backend in its own terminal ────────────────────
echo "▸ Opening backend terminal (Django @ http://localhost:8000)..."
gnome-terminal --title="🥚 Egg Hunt — Backend" -- bash -c "
  cd '$ROOT_DIR/backend'
  source '$ROOT_DIR/venv/bin/activate'
  echo '🥚  Egg Hunt — Backend Server'
  echo '════════════════════════════════════════'
  echo ''
  python manage.py runserver 0.0.0.0:8000
  echo ''
  echo 'Server stopped. Press Enter to close.'
  read
"

# ── Start Frontend in its own terminal ───────────────────
echo "▸ Opening frontend terminal (React @ http://localhost:5173)..."
gnome-terminal --title="🥚 Egg Hunt — Frontend" -- bash -c "
  cd '$ROOT_DIR/frontend'
  echo '🥚  Egg Hunt — Frontend Server'
  echo '════════════════════════════════════════'
  echo ''
  npm run dev -- --host
  echo ''
  echo 'Server stopped. Press Enter to close.'
  read
"

echo ""
echo "════════════════════════════════════════"
echo "✅  Both terminals launched!"
echo ""
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo ""
echo "   Close each terminal window to stop its server."
echo "════════════════════════════════════════"
