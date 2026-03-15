#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Egg Hunt — Run on Raspberry Pi (or any headless Linux)
#  Starts backend, frontend, and optionally ngrok tunnels
#  as background processes. All output goes to logs/.
#
#  Usage:
#    ./run-pi.sh              # local only
#    ./run-pi.sh --ngrok      # with ngrok tunnels
#    ./run-pi.sh --stop       # stop all services
# ─────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

# ── Load .env ─────────────────────────────────────────────
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

# ── Helpers ───────────────────────────────────────────────
stop_all() {
  echo ""
  echo "▸ Stopping services..."
  for pidfile in "$PID_DIR"/*.pid; do
    [ -f "$pidfile" ] || continue
    name="$(basename "$pidfile" .pid)"
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      sleep 0.3
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
      echo "  ✓ $name stopped (pid $pid)"
    else
      echo "  ⊘ $name was not running"
    fi
    rm -f "$pidfile"
  done
  echo ""
  echo "All services stopped."
  exit 0
}

# Extract domain from a URL (https://foo.bar.com → foo.bar.com)
domain_from_url() {
  echo "$1" | sed 's|https\?://||' | sed 's|/.*||'
}

launch() {
  local name="$1" logfile="$LOG_DIR/$name.log" pidfile="$PID_DIR/$name.pid"
  shift

  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "  ⊘ $name already running (pid $(cat "$pidfile"))"
    return
  fi

  "$@" > "$logfile" 2>&1 &
  echo $! > "$pidfile"
  echo "  ✓ $name started (pid $!) → logs/$name.log"
}

# ── Handle --stop ─────────────────────────────────────────
if [ "$1" = "--stop" ]; then
  stop_all
fi

# ── Banner ────────────────────────────────────────────────
USE_NGROK=false
[ "$1" = "--ngrok" ] && USE_NGROK=true

echo ""
echo "🥚  Egg Hunt — Raspberry Pi Launcher"
echo "════════════════════════════════════════"

# ── Pre-flight checks ────────────────────────────────────
PYTHON="$ROOT_DIR/venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  echo ""
  echo "❌ Python venv not found at: $PYTHON"
  echo "   Run ./setup.sh first."
  exit 1
fi

# ── Start Backend ─────────────────────────────────────────
echo ""
echo "▸ Starting backend..."
cd "$ROOT_DIR/backend"
launch "backend" "$PYTHON" manage.py runserver --noreload 0.0.0.0:8000

# ── Start Frontend ────────────────────────────────────────
echo ""
echo "▸ Starting frontend..."
cd "$ROOT_DIR/frontend"
launch "frontend" npx vite --host

# ── Start ngrok tunnels (optional) ────────────────────────
BACKEND_DOMAIN=""
FRONTEND_DOMAIN=""

if $USE_NGROK; then
  if ! command -v ngrok &>/dev/null; then
    echo ""
    echo "❌ ngrok is not installed. Install from https://ngrok.com/download"
    echo "   Skipping tunnels — servers are running on LAN only."
  else
    if echo "$BACKEND_URL" | grep -q 'ngrok'; then
      BACKEND_DOMAIN="$(domain_from_url "$BACKEND_URL")"
    fi
    if echo "$FRONTEND_URL" | grep -q 'ngrok'; then
      FRONTEND_DOMAIN="$(domain_from_url "$FRONTEND_URL")"
    fi

    echo ""
    echo "▸ Starting ngrok tunnels..."
    cd "$ROOT_DIR"

    if [ -n "$BACKEND_DOMAIN" ]; then
      launch "ngrok-backend" ngrok http --url="$BACKEND_DOMAIN" 8000
    else
      launch "ngrok-backend" ngrok http 8000
    fi

    if [ -n "$FRONTEND_DOMAIN" ]; then
      launch "ngrok-frontend" ngrok http --url="$FRONTEND_DOMAIN" 5173
    else
      launch "ngrok-frontend" ngrok http 5173
    fi
  fi
fi

# ── Verify backend is alive ──────────────────────────────
sleep 3
BPID_FILE="$PID_DIR/backend.pid"
if [ -f "$BPID_FILE" ]; then
  BPID="$(cat "$BPID_FILE")"
  if ! kill -0 "$BPID" 2>/dev/null; then
    echo ""
    echo "⚠  Backend crashed on startup (pid $BPID)."
    echo "── logs/backend.log ──────────────────────"
    cat "$LOG_DIR/backend.log" 2>/dev/null || echo "(empty)"
    echo "───────────────────────────────────────────"
  fi
fi

# ── Summary ───────────────────────────────────────────────
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo ""
echo "════════════════════════════════════════"
echo "🚀  Services running!"
echo ""
echo "   Frontend:  http://${LAN_IP:-localhost}:5173"
echo "   Backend:   http://${LAN_IP:-localhost}:8000"
if $USE_NGROK; then
  [ -n "$FRONTEND_DOMAIN" ] && echo "   Tunnel:    https://$FRONTEND_DOMAIN"
  [ -n "$BACKEND_DOMAIN" ]  && echo "   Tunnel:    https://$BACKEND_DOMAIN"
fi
echo ""
echo "   Logs:      ls logs/"
echo "   Tail:      tail -f logs/backend.log"
echo "   Stop:      ./run-pi.sh --stop"
echo "════════════════════════════════════════"
