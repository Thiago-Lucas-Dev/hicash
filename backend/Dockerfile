FROM php:8.5-fpm-alpine3.23

RUN apk add --no-cache nginx supervisor ca-certificates icu-dev oniguruma-dev \
    && docker-php-ext-install pdo_mysql bcmath intl mbstring opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts --optimize-autoloader
COPY . .
RUN composer dump-autoload --no-dev --optimize --no-interaction \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080
ENTRYPOINT ["sh", "/var/www/html/docker/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
