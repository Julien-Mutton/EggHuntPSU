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

# ── Load .env ────────────────────────────────────────────
if [ -f "$ROOT_DIR/.env" ]; then
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

# ── Helpers ──────────────────────────────────────────────
start_process() {
  local name="$1" cmd="$2" dir="$3" log="$LOG_DIR/$name.log"
  local pidfile="$PID_DIR/$name.pid"

  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "  ⊘ $name already running (pid $(cat "$pidfile"))"
    return
  fi

  cd "$dir"
  nohup bash -c "$cmd" > "$log" 2>&1 &
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
      kill "$pid" 2>/dev/null
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
  "source '$ROOT_DIR/venv/bin/activate' && python manage.py runserver 0.0.0.0:8000" \
  "$ROOT_DIR/backend"

# ── Start Frontend ───────────────────────────────────────
echo ""
echo "▸ Starting frontend..."
start_process "frontend" \
  "npm run dev -- --host" \
  "$ROOT_DIR/frontend"

# ── Start ngrok tunnels (optional) ──────────────────────
if $USE_NGROK; then
  if ! command -v ngrok &>/dev/null; then
    echo ""
    echo "❌ ngrok is not installed. Install from https://ngrok.com/download"
    echo "   Skipping tunnels — servers are running on LAN only."
  else
    BACKEND_DOMAIN="${NGROK_BACKEND_DOMAIN:-}"
    FRONTEND_DOMAIN="${NGROK_FRONTEND_DOMAIN:-}"

    echo ""
    echo "▸ Starting ngrok tunnels..."

    if [ -n "$BACKEND_DOMAIN" ]; then
      start_process "ngrok-backend" \
        "ngrok http --url=https://$BACKEND_DOMAIN --pooling-enabled 8000" \
        "$ROOT_DIR"
    else
      start_process "ngrok-backend" \
        "ngrok http 8000" \
        "$ROOT_DIR"
    fi

    if [ -n "$FRONTEND_DOMAIN" ]; then
      start_process "ngrok-frontend" \
        "ngrok http --url=https://$FRONTEND_DOMAIN --pooling-enabled 5173" \
        "$ROOT_DIR"
    else
      start_process "ngrok-frontend" \
        "ngrok http 5173" \
        "$ROOT_DIR"
    fi
  fi
fi

# ── Summary ──────────────────────────────────────────────
sleep 1
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
