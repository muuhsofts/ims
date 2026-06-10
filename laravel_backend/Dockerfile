FROM php:8.3-fpm-alpine

# ============================================================
# SYSTEM PACKAGES
# ============================================================
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    nodejs \
    npm \
    mysql-client \
    libzip-dev \
    oniguruma-dev \
    libxml2-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    zip \
    unzip \
    netcat-openbsd

# ============================================================
# PHP EXTENSIONS
# ============================================================
RUN docker-php-ext-configure gd \
    --with-freetype \
    --with-jpeg

RUN docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    xml \
    opcache \
    zip

# ============================================================
# COMPOSER
# ============================================================
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

# ============================================================
# INSTALL DEPENDENCIES
# ============================================================
RUN composer install --no-interaction --optimize-autoloader --no-dev

RUN npm install && npm run build || true

# ============================================================
# NGINX CONFIG
# ============================================================
RUN mkdir -p /run/nginx

RUN printf '%s\n' \
'user nginx;' \
'worker_processes auto;' \
'pid /run/nginx.pid;' \
'' \
'events {' \
'  worker_connections 1024;' \
'}' \
'' \
'http {' \
'  include /etc/nginx/mime.types;' \
'  default_type application/octet-stream;' \
'' \
'  server {' \
'    listen 80;' \
'    index index.php index.html;' \
'    root /var/www/html/public;' \
'' \
'    location / {' \
'      try_files $uri $uri/ /index.php?$query_string;' \
'    }' \
'' \
'    location ~ \.php$ {' \
'      include fastcgi_params;' \
'      fastcgi_pass 127.0.0.1:9000;' \
'      fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;' \
'    }' \
'  }' \
'}' \
> /etc/nginx/nginx.conf

# ============================================================
# SUPERVISOR CONFIG
# ============================================================
RUN mkdir -p /etc/supervisor.d

RUN printf '%s\n' \
'[supervisord]' \
'nodaemon=true' \
'' \
'[program:php-fpm]' \
'command=php-fpm -F' \
'autostart=true' \
'autorestart=true' \
'' \
'[program:nginx]' \
'command=nginx -g "daemon off;"' \
'autostart=true' \
'autorestart=true' \
> /etc/supervisor.d/supervisord.ini

# ============================================================
# ENTRYPOINT
# ============================================================
RUN printf '%s\n' \
'#!/bin/sh' \
'set -e' \
'' \
'DB_HOST=${DB_HOST:-mysql-service}' \
'' \
'echo "Waiting for MySQL..."' \
'while ! nc -z $DB_HOST 3306; do sleep 1; done' \
'' \
'echo "MySQL ready"' \
'' \
'php artisan config:cache || true' \
'php artisan route:cache || true' \
'php artisan view:cache || true' \
'' \
'chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache' \
'' \
'exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.ini' \
> /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

# ============================================================
# PERMISSIONS
# ============================================================
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]