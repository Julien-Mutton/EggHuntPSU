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
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

# ── Load .env (handles quoted values with spaces) ────────
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

# ── Helpers ──────────────────────────────────────────────
start_process() {
  local name="$1" cmd="$2" dir="$3" log="$LOG_DIR/$name.log"
  local pidfile="$PID_DIR/$name.pid"

  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "  ⊘ $name already running (pid $(cat "$pidfile"))"
    return
  fi

  > "$log"
  cd "$dir"
  nohup bash -c "exec $cmd" >> "$log" 2>&1 &
  echo $! > "$pidfile"
  echo "  ✓ $name started (pid $!) → logs/$name.log"
}

stop_all() {
  echo ""
  echo "▸ Stopping services..."
  for pidfile in "$PID_DIR"/*.pid; do
    [ -f "$pidfile" ] || continue
    local name pid
    name="$(basename "$pidfile" .pid)"
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null
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

# ── Handle --stop ────────────────────────────────────────
if [ "$1" = "--stop" ]; then
  stop_all
fi

# ── Banner ───────────────────────────────────────────────
USE_NGROK=false
[ "$1" = "--ngrok" ] && USE_NGROK=true

echo ""
echo "🥚  Egg Hunt — Raspberry Pi Launcher"
echo "════════════════════════════════════════"

# ── Start Backend ────────────────────────────────────────
echo ""
echo "▸ Starting backend..."
start_process "backend" \
  "'$ROOT_DIR/venv/bin/python' manage.py runserver --noreload 0.0.0.0:8000" \
  "$ROOT_DIR/backend"

# ── Start Frontend ───────────────────────────────────────
echo ""
echo "▸ Starting frontend..."
start_process "frontend" \
  "npm run dev -- --host" \
  "$ROOT_DIR/frontend"

# ── Start ngrok tunnels (optional) ──────────────────────
BACKEND_DOMAIN=""
FRONTEND_DOMAIN=""

if $USE_NGROK; then
  if ! command -v ngrok &>/dev/null; then
    echo ""
    echo "❌ ngrok is not installed. Install from https://ngrok.com/download"
    echo "   Skipping tunnels — servers are running on LAN only."
  else
    # Extract domains from BACKEND_URL / FRONTEND_URL if they contain ngrok
    if echo "$BACKEND_URL" | grep -q 'ngrok'; then
      BACKEND_DOMAIN="$(domain_from_url "$BACKEND_URL")"
    fi
    if echo "$FRONTEND_URL" | grep -q 'ngrok'; then
      FRONTEND_DOMAIN="$(domain_from_url "$FRONTEND_URL")"
    fi

    echo ""
    echo "▸ Starting ngrok tunnels..."

    if [ -n "$BACKEND_DOMAIN" ]; then
      start_process "ngrok-backend" \
        "ngrok http --url=$BACKEND_DOMAIN 8000" \
        "$ROOT_DIR"
    else
      start_process "ngrok-backend" \
        "ngrok http 8000" \
        "$ROOT_DIR"
    fi

    if [ -n "$FRONTEND_DOMAIN" ]; then
      start_process "ngrok-frontend" \
        "ngrok http --url=$FRONTEND_DOMAIN 5173" \
        "$ROOT_DIR"
    else
      start_process "ngrok-frontend" \
        "ngrok http 5173" \
        "$ROOT_DIR"
    fi
  fi
fi

# ── Wait and verify backend is alive ────────────────────
sleep 4
BACKEND_PID_FILE="$PID_DIR/backend.pid"
if [ -f "$BACKEND_PID_FILE" ] && ! kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
  echo ""
  echo "⚠  Backend crashed on startup. Last 20 lines of logs/backend.log:"
  echo "────────────────────────────────────────"
  tail -20 "$LOG_DIR/backend.log" 2>/dev/null || echo "(no log output)"
  echo "────────────────────────────────────────"
fi

# ── Summary ──────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "🚀  Services running!"
echo ""
echo "   Frontend:  http://$(hostname -I | awk '{print $1}'):5173"
echo "   Backend:   http://$(hostname -I | awk '{print $1}'):8000"
if $USE_NGROK; then
  [ -n "$FRONTEND_DOMAIN" ] && echo "   Tunnel:    https://$FRONTEND_DOMAIN"
  [ -n "$BACKEND_DOMAIN" ]  && echo "   Tunnel:    https://$BACKEND_DOMAIN"
fi
echo ""
echo "   Logs:      ls logs/"
echo "   Tail:      tail -f logs/backend.log"
echo "   Stop:      ./run-pi.sh --stop"
echo "════════════════════════════════════════"
