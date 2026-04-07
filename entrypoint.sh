#!/bin/sh
set -e

echo "Running database migrations..."
dbmate --no-dump-schema up

echo "Starting server..."
exec bun --sql-preconnect app/index.ts
