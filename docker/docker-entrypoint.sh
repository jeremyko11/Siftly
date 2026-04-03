#!/bin/sh
set -e
# Run any pending migrations against the SQLite database
node_modules/.bin/prisma migrate deploy
# Start the app — listen on all interfaces so Render can proxy traffic
export HOST=0.0.0.0
PORT=${PORT:-3000}
exec node_modules/.bin/next start -p $PORT
