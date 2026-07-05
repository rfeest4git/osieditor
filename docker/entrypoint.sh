#!/bin/sh
# Start the Hono API server in the background, then run nginx in the foreground.
# If the API exits, stop the container so the orchestrator can restart it.
set -e

PORT="${PORT:-3001}" node /app/server.mjs &
API_PID=$!

# Stop nginx if the API dies.
trap 'kill "$API_PID" 2>/dev/null || true' TERM INT

# Wait briefly for the API to bind before starting nginx.
sleep 1

nginx -g 'daemon off;' &
NGINX_PID=$!

# Exit when either process exits.
wait -n "$API_PID" "$NGINX_PID"
EXIT_CODE=$?
kill "$API_PID" "$NGINX_PID" 2>/dev/null || true
exit "$EXIT_CODE"
