<?php

/**
 * @file
 * Configures CORS in Drupal services.yml for POC development.
 *
 * Run via: ddev drush scr scripts/configure_cors.php
 */

$services_path = DRUPAL_ROOT . '/sites/default/services.yml';
$default_path = DRUPAL_ROOT . '/sites/default/default.services.yml';

// Copy default if services.yml doesn't exist
if (!file_exists($services_path)) {
  copy($default_path, $services_path);
  echo "Copied default.services.yml to services.yml\n";
}

$content = file_get_contents($services_path);

// Replace CORS settings for POC — permissive for local dev
$cors_replacements = [
  '    enabled: false' => '    enabled: true',
  '    allowedHeaders: []' => "    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']",
  '    allowedMethods: []' => "    allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']",
  "    allowedOrigins: ['*']" => "    allowedOrigins: ['*']",
  '    exposedHeaders: false' => "    exposedHeaders: ['Content-Type', 'Authorization']",
  '    maxAge: false' => '    maxAge: 600',
  '    supportsCredentials: false' => '    supportsCredentials: true',
];

foreach ($cors_replacements as $search => $replace) {
  $content = str_replace($search, $replace, $content);
}

file_put_contents($services_path, $content);
echo "✅ CORS configured in services.yml:\n";
echo "   - enabled: true\n";
echo "   - allowedHeaders: Content-Type, Authorization, X-Requested-With, Accept\n";
echo "   - allowedMethods: GET, POST, PATCH, DELETE, OPTIONS\n";
echo "   - allowedOrigins: * (all — POC only, lock down in production)\n";
echo "   - exposedHeaders: Content-Type, Authorization\n";
echo "   - maxAge: 600 (10 min preflight cache)\n";
echo "   - supportsCredentials: true\n";
