<?php

/**
 * @file
 * Enables webform_rest REST resource configurations.
 *
 * Run via: ddev drush scr scripts/enable_webform_rest.php
 */

use Drupal\rest\Entity\RestResourceConfig;

$resources = [
  'webform_rest_elements' => ['GET' => ['supported_formats' => ['json'], 'supported_auth' => ['cookie']]],
  'webform_rest_fields' => ['GET' => ['supported_formats' => ['json'], 'supported_auth' => ['cookie']]],
  'webform_rest_submit' => ['POST' => ['supported_formats' => ['json'], 'supported_auth' => ['cookie']]],
];

foreach ($resources as $id => $methods) {
  $config = RestResourceConfig::load($id);
  if (!$config) {
    $config = RestResourceConfig::create([
      'id' => $id,
      'plugin_id' => $id,
      'granularity' => 'method',
      'configuration' => $methods,
    ]);
    $config->save();
    echo "✅ Enabled REST resource: $id\n";
  } else {
    echo "ℹ️ REST resource already exists: $id\n";
  }
}

// Grant anonymous access to GET resources
$anonymous = \Drupal\user\Entity\Role::load('anonymous');
$anonymous->grantPermission('restful get webform_rest_elements');
$anonymous->grantPermission('restful get webform_rest_fields');
$anonymous->save();
echo "✅ Granted anonymous GET permissions for elements + fields\n";
