<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', ''))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'X-CSRF-TOKEN', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
