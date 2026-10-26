#!/bin/sh
set -eu

: "${APP_KEY:?APP_KEY is required}"
: "${DB_HOST:?DB_HOST is required}"

php artisan config:cache
exec "$@"
