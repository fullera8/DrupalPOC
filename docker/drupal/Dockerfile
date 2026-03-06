# =============================================================================
# Drupal 11 Headless CMS — PHP 8.4-FPM + Nginx
# =============================================================================
# Multi-stage build:
#   Stage 1 (composer): Install PHP dependencies via Composer
#   Stage 2 (drupal):   PHP 8.4-FPM with Drupal + extensions
#   Stage 3 (nginx):    Nginx reverse proxy for PHP-FPM
#
# Production target: Azure MySQL (***REDACTED_MYSQL_HOST***)
# Connection configured via environment variables at runtime.
#
# Image: ghcr.io/fullera8/drupalpoc-drupal:latest
# Ports: 80 (nginx → php-fpm:9000)
# =============================================================================

# --- Stage 1: Composer Install ---
FROM composer:2 AS composer
WORKDIR /app

# Copy Composer manifests first (layer caching)
COPY composer.json composer.lock ./

# Install dependencies without dev packages, no scripts (no Drupal bootstrap yet)
# --ignore-platform-reqs because ext-gd etc. are in the runtime stage, not composer
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts \
    --ignore-platform-reqs

# Copy the rest of the project (scripts, web scaffolding, custom code)
COPY web/ web/
COPY scripts/ scripts/
COPY recipes/ recipes/

# Run Composer scripts now that the full project is available
# This triggers drupal-scaffold which places index.php, .htaccess, etc.
RUN composer drupal:scaffold

# --- Stage 2: PHP-FPM Runtime ---
FROM php:8.4-fpm AS drupal

# Install system dependencies for PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libwebp-dev \
    libzip-dev \
    libxml2-dev \
    libonig-dev \
    libcurl4-openssl-dev \
    unzip \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions required by Drupal 11
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install -j$(nproc) \
        gd \
        opcache \
        pdo \
        pdo_mysql \
        zip \
        xml \
        mbstring \
        curl

# PHP production settings
RUN { \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=8'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.revalidate_freq=60'; \
    echo 'opcache.enable=1'; \
    echo 'opcache.enable_cli=0'; \
    } > /usr/local/etc/php/conf.d/opcache-prod.ini

RUN { \
    echo 'memory_limit=256M'; \
    echo 'upload_max_filesize=64M'; \
    echo 'post_max_size=64M'; \
    echo 'max_execution_time=300'; \
    echo 'expose_php=Off'; \
    } > /usr/local/etc/php/conf.d/drupal-prod.ini

WORKDIR /var/www/html

# Copy Composer-installed dependencies from Stage 1
COPY --from=composer /app/vendor/ vendor/
COPY --from=composer /app/web/ web/

# Copy custom project files
COPY scripts/ scripts/
COPY recipes/ recipes/
COPY composer.json composer.lock ./

# Copy Drush binary (installed by Composer)
COPY --from=composer /app/vendor/bin/drush vendor/bin/drush

# Create Drupal files directory and set permissions
RUN mkdir -p web/sites/default/files \
    && chown -R www-data:www-data web/sites/default/files \
    && chmod 755 web/sites/default/files

# Copy settings template that reads from environment variables
COPY docker/drupal/settings.php web/sites/default/settings.php
RUN chown www-data:www-data web/sites/default/settings.php \
    && chmod 644 web/sites/default/settings.php

# Expose PHP-FPM port
EXPOSE 9000

# PHP-FPM runs as www-data by default
CMD ["php-fpm"]

# --- Stage 3: Nginx ---
FROM nginx:alpine AS nginx

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy Drupal-optimized nginx config
COPY docker/drupal/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static web assets from Composer stage (for nginx to serve directly)
COPY --from=composer /app/web/ /var/www/html/web/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
