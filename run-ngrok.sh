#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Egg Hunt — Run with ngrok
#  Opens two separate terminals for backend and frontend,
#  then starts ngrok tunnels.
# ─────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

BACKEND_DOMAIN="egghunt-backend.ngrok.pizza"
FRONTEND_DOMAIN="egghunt.ngrok.app"

echo ""
echo "🥚  Egg Hunt — Ngrok Deployment"
echo "════════════════════════════════════════"

# ── Check if ngrok is installed ─────────────────────────
if ! command -v ngrok &> /dev/null; then
    echo ""
    echo "❌ ngrok is not installed or not in PATH."
    echo "   Install it from: https://ngrok.com/download"
    exit 1
fi

echo "✅ ngrok found: $(ngrok version)"
echo ""

# ── Start Backend in its own terminal ────────────────────
echo "▸ Opening backend terminal (Django @ http://localhost:8000)..."
gnome-terminal --title="🥚 Egg Hunt — Backend" -- bash -c "
  cd '$ROOT_DIR/backend'
  source '$ROOT_DIR/venv/bin/activate'
  echo '🥚  Egg Hunt — Backend Server'
  echo '════════════════════════════════════════'
  echo ''
  echo 'Backend URL: https://$BACKEND_DOMAIN'
  echo ''
  python manage.py runserver 0.0.0.0:8000
  echo ''
  echo 'Server stopped. Press Enter to close.'
  read
"

# ── Start Frontend in its own terminal ───────────────────
echo "▸ Opening frontend terminal (Vite @ http://localhost:5173)..."
gnome-terminal --title="🥚 Egg Hunt — Frontend" -- bash -c "
  cd '$ROOT_DIR/frontend'
  echo '🥚  Egg Hunt — Frontend Server'
  echo '════════════════════════════════════════'
  echo ''
  echo 'Frontend URL: https://$FRONTEND_DOMAIN'
  echo ''
  npm run dev -- --host
  echo ''
  echo 'Server stopped. Press Enter to close.'
  read
"

sleep 2

# ── Start ngrok tunnels ─────────────────────────────────
echo "▸ Opening ngrok backend tunnel..."
gnome-terminal --title="🥚 ngrok — Backend" -- bash -c "
  echo '🥚  ngrok — Backend Tunnel'
  echo '════════════════════════════════════════'
  echo 'Tunneling http://localhost:8000 → https://$BACKEND_DOMAIN'
  echo ''
  ngrok http --url=https://$BACKEND_DOMAIN --pooling-enabled 8000
  echo ''
  echo 'Tunnel closed. Press Enter to close.'
  read
"

echo "▸ Opening ngrok frontend tunnel..."
gnome-terminal --title="🥚 ngrok — Frontend" -- bash -c "
  echo '🥚  ngrok — Frontend Tunnel'
  echo '════════════════════════════════════════'
  echo 'Tunneling http://localhost:5173 → https://$FRONTEND_DOMAIN'
  echo ''
  ngrok http --url=https://$FRONTEND_DOMAIN --pooling-enabled 5173
  echo ''
  echo 'Tunnel closed. Press Enter to close.'
  read
"

echo ""
echo "════════════════════════════════════════"
echo "🚀  All terminals launched!"
echo ""
echo "   Frontend:  https://$FRONTEND_DOMAIN"
echo "   Backend:   https://$BACKEND_DOMAIN"
echo ""
echo "   Close each terminal window to stop its service."
echo "════════════════════════════════════════"
