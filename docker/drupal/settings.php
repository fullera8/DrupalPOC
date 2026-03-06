<?php

/**
 * @file
 * Drupal settings for production (AKS / Docker).
 *
 * Database credentials are injected via environment variables.
 * In AKS, these come from Kubernetes Secrets / ConfigMaps.
 * For local Docker testing, pass them via docker run -e or docker-compose.
 *
 * Required environment variables:
 *   DRUPAL_DB_HOST     - MySQL host (e.g., ***REDACTED_MYSQL_HOST***)
 *   DRUPAL_DB_PORT     - MySQL port (default: 3306)
 *   DRUPAL_DB_NAME     - Database name (e.g., drupal)
 *   DRUPAL_DB_USER     - Database username
 *   DRUPAL_DB_PASSWORD - Database password
 *   DRUPAL_HASH_SALT   - Unique hash salt for this installation
 */

$databases['default']['default'] = [
  'database' => getenv('DRUPAL_DB_NAME') ?: 'drupal',
  'username' => getenv('DRUPAL_DB_USER') ?: 'drupal',
  'password' => getenv('DRUPAL_DB_PASSWORD') ?: '',
  'host' => getenv('DRUPAL_DB_HOST') ?: 'db',
  'port' => getenv('DRUPAL_DB_PORT') ?: '3306',
  'driver' => 'mysql',
  'prefix' => '',
  'collation' => 'utf8mb4_general_ci',
  'pdo' => [
    // Azure MySQL requires SSL in production
    // Uncomment for Azure MySQL (post-POC hardening):
    // \PDO::MYSQL_ATTR_SSL_CA => '/etc/ssl/certs/DigiCertGlobalRootCA.crt.pem',
    // \PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => TRUE,
  ],
];

/**
 * Salt for one-time login links, cancel links, form tokens, etc.
 */
$settings['hash_salt'] = getenv('DRUPAL_HASH_SALT') ?: 'change-me-in-production-this-is-insecure';

/**
 * Trusted host patterns.
 * Restrict to known hostnames to prevent HTTP Host header attacks.
 * Update for your AKS ingress domain.
 */
$settings['trusted_host_patterns'] = [
  // AKS cluster IP / ingress (update on Day 3)
  '^.+$',  // Permissive for POC — lock down post-POC
];

/**
 * File paths.
 */
$settings['file_public_path'] = 'sites/default/files';
$settings['file_private_path'] = 'sites/default/private';
$settings['file_temp_path'] = '/tmp';

/**
 * Config sync directory.
 */
$settings['config_sync_directory'] = '../config/sync';

/**
 * Error reporting — do not expose errors in production.
 */
$config['system.logging']['error_level'] = 'hide';

/**
 * Aggregation — improve frontend performance.
 */
$config['system.performance']['css']['preprocess'] = TRUE;
$config['system.performance']['js']['preprocess'] = TRUE;

/**
 * Reverse proxy settings for nginx.
 * Drupal is behind nginx, so we need to trust the proxy headers.
 */
$settings['reverse_proxy'] = TRUE;
$settings['reverse_proxy_addresses'] = ['127.0.0.1', '::1'];
