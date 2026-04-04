#!/bin/sh
set -e
# Run any pending migrations against the SQLite database
node_modules/.bin/prisma migrate deploy || true
# Start the app
exec node_modules/.bin/next start
