#!/bin/sh
set -e

DB_HOST=${DB_HOST:-mysql-service}

echo "Waiting for MySQL at $DB_HOST:3306..."

until nc -z $DB_HOST 3306; do
  echo "MySQL not ready yet..."
  sleep 2
done

echo "MySQL is ready"

mkdir -p storage/framework/views \
         storage/framework/cache \
         storage/framework/sessions

php artisan optimize:clear || true
php artisan config:cache || true
php artisan route:cache || true

echo "Starting PHP-FPM..."

exec php-fpm