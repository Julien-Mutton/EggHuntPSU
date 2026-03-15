#!/usr/bin/env bash
# ──────────────────────────────────────────────────────
#  Egg Hunt — Raspberry Pi Deployment
#
#  Usage:
#    ./run-pi.sh            Start all services + ngrok
#    ./run-pi.sh stop       Stop everything
#    ./run-pi.sh status     Check what's running
# ──────────────────────────────────────────────────────

DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$DIR/.pids.txt"
LOGDIR="$DIR/logs"

# ── Load .env ─────────────────────────────────────────
[ -f "$DIR/.env" ] && { set -a; . "$DIR/.env"; set +a; }

# ── Find python venv ──────────────────────────────────
PYTHON=""
for p in "$DIR/backend/venv/bin/python" "$DIR/venv/bin/python"; do
  [ -x "$p" ] && PYTHON="$p" && break
done

# ── Extract ngrok domains from URLs in .env ───────────
BACKEND_DOMAIN="$(echo "${BACKEND_URL:-}" | sed 's|https\?://||;s|/.*||')"
FRONTEND_DOMAIN="$(echo "${FRONTEND_URL:-}" | sed 's|https\?://||;s|/.*||')"

# ── Kill previously saved PIDs ────────────────────────
kill_saved() {
  [ -f "$PIDFILE" ] || return 0
  while IFS= read -r pid; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null
  done < "$PIDFILE"
  sleep 0.5
  while IFS= read -r pid; do
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
  done < "$PIDFILE"
  rm -f "$PIDFILE"
}

# ──────────────────────────────────────────────────────
#  Commands
# ──────────────────────────────────────────────────────
case "${1:-start}" in

# ── STOP ──────────────────────────────────────────────
stop)
  echo "Stopping all services..."
  kill_saved
  echo "Done."
  ;;

# ── STATUS ────────────────────────────────────────────
status)
  if [ ! -f "$PIDFILE" ]; then
    echo "No services running."
    exit 0
  fi
  NAMES=("backend" "frontend" "ngrok-backend" "ngrok-frontend")
  i=0
  while IFS= read -r pid; do
    name="${NAMES[$i]:-service-$i}"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "  ✓ $name  (pid $pid)"
    else
      echo "  ✗ $name  (dead)"
    fi
    i=$((i + 1))
  done < "$PIDFILE"
  ;;

# ── START ─────────────────────────────────────────────
start)
  # Preflight checks
  ERRORS=""
  [ -z "$PYTHON" ]                          && ERRORS="${ERRORS}  • Python venv not found (run setup.sh first)\n"
  ! command -v ngrok >/dev/null 2>&1        && ERRORS="${ERRORS}  • ngrok is not installed\n"
  ! command -v npm   >/dev/null 2>&1        && ERRORS="${ERRORS}  • npm is not installed\n"
  [ -z "$BACKEND_DOMAIN" ]                  && ERRORS="${ERRORS}  • BACKEND_URL not set in .env\n"
  [ -z "$FRONTEND_DOMAIN" ]                 && ERRORS="${ERRORS}  • FRONTEND_URL not set in .env\n"

  if [ -n "$ERRORS" ]; then
    echo "Cannot start — fix these first:"
    printf "$ERRORS"
    exit 1
  fi

  # Stop leftovers from a previous run
  kill_saved
  mkdir -p "$LOGDIR"
  : > "$PIDFILE"

  echo ""
  echo "Egg Hunt — Starting services"
  echo "────────────────────────────────"

  # 1) Backend — Django on port 8000
  cd "$DIR/backend"
  nohup "$PYTHON" manage.py runserver --noreload 0.0.0.0:8000 \
    > "$LOGDIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo "$BACKEND_PID" >> "$PIDFILE"
  echo "  backend        pid $BACKEND_PID"

  # 2) Frontend — Vite on port 5173
  cd "$DIR/frontend"
  nohup npx vite --host \
    > "$LOGDIR/frontend.log" 2>&1 &
  echo "$!" >> "$PIDFILE"
  echo "  frontend       pid $!"

  # 3) ngrok tunnel → backend
  cd "$DIR"
  nohup ngrok http --url "https://$BACKEND_DOMAIN" 8000 \
    > "$LOGDIR/ngrok-backend.log" 2>&1 &
  echo "$!" >> "$PIDFILE"
  echo "  ngrok → :8000  pid $!"

  # 4) ngrok tunnel → frontend
  nohup ngrok http --url "https://$FRONTEND_DOMAIN" 5173 \
    > "$LOGDIR/ngrok-frontend.log" 2>&1 &
  echo "$!" >> "$PIDFILE"
  echo "  ngrok → :5173  pid $!"

  # Give the backend a moment to boot
  echo ""
  echo "  Waiting for backend..."
  sleep 4

  if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "  backend ok ✓"
  else
    echo ""
    echo "  ✗ Backend crashed. Log output:"
    echo "  ──────────────────────────────"
    cat "$LOGDIR/backend.log" 2>/dev/null || echo "  (no output)"
    echo "  ──────────────────────────────"
  fi

  LAN="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo ""
  echo "────────────────────────────────"
  echo "  Frontend  https://$FRONTEND_DOMAIN"
  echo "  Backend   https://$BACKEND_DOMAIN"
  echo "  LAN       http://${LAN:-localhost}:5173"
  echo ""
  echo "  Logs      tail -f logs/backend.log"
  echo "  Status    ./run-pi.sh status"
  echo "  Stop      ./run-pi.sh stop"
  echo "────────────────────────────────"
  ;;

*)
  echo "Usage: ./run-pi.sh [start|stop|status]"
  ;;

esac
