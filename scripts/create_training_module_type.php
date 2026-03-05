<?php

/**
 * @file
 * Creates the Training Module content type and its fields for the DrupalPOC.
 *
 * Run via: ddev drush scr scripts/create_training_module_type.php
 */

use Drupal\node\Entity\NodeType;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;
use Drupal\taxonomy\Entity\Vocabulary;

// --- 1. Create the "Training Module" content type ---
if (!NodeType::load('training_module')) {
  $type = NodeType::create([
    'type' => 'training_module',
    'name' => 'Training Module',
    'description' => 'A security awareness training module with video content, categorization, and difficulty level.',
    'new_revision' => TRUE,
  ]);
  $type->save();
  echo "✅ Content type 'training_module' created.\n";
} else {
  echo "ℹ️ Content type 'training_module' already exists.\n";
}

// --- 2. Create the "Training Category" taxonomy vocabulary ---
if (!Vocabulary::load('training_category')) {
  $vocab = Vocabulary::create([
    'vid' => 'training_category',
    'name' => 'Training Category',
    'description' => 'Categories for security awareness training modules (e.g., Phishing, Social Engineering, Password Hygiene).',
  ]);
  $vocab->save();
  echo "✅ Vocabulary 'training_category' created.\n";

  // Seed default terms
  $terms = [
    'Phishing Awareness',
    'Social Engineering',
    'Password Hygiene',
    'Data Handling & Privacy',
    'Incident Reporting',
    'Physical Security',
  ];
  foreach ($terms as $term_name) {
    \Drupal\taxonomy\Entity\Term::create([
      'vid' => 'training_category',
      'name' => $term_name,
    ])->save();
  }
  echo "✅ Seeded " . count($terms) . " training category terms.\n";
} else {
  echo "ℹ️ Vocabulary 'training_category' already exists.\n";
}

// --- 3. Add fields to Training Module content type ---

// Helper function to create a field if it doesn't exist
function ensure_field($entity_type, $bundle, $field_name, $field_type, $label, $description, $storage_settings = [], $field_settings = []) {
  // Create field storage if it doesn't exist
  if (!FieldStorageConfig::loadByName($entity_type, $field_name)) {
    FieldStorageConfig::create([
      'field_name' => $field_name,
      'entity_type' => $entity_type,
      'type' => $field_type,
      'cardinality' => 1,
      'settings' => $storage_settings,
    ])->save();
    echo "  ✅ Field storage '$field_name' created.\n";
  }

  // Create field instance if it doesn't exist
  if (!FieldConfig::loadByName($entity_type, $bundle, $field_name)) {
    FieldConfig::create([
      'field_name' => $field_name,
      'entity_type' => $entity_type,
      'bundle' => $bundle,
      'label' => $label,
      'description' => $description,
      'required' => FALSE,
      'settings' => $field_settings,
    ])->save();
    echo "  ✅ Field instance '$field_name' added to '$bundle'.\n";
  }
}

// field_description — Long text for module description/summary
ensure_field('node', 'training_module', 'field_description', 'text_long',
  'Description',
  'A summary of what this training module covers.'
);

// field_video_url — URL field for embedded video (YouTube/Vimeo)
ensure_field('node', 'training_module', 'field_video_url', 'link',
  'Video URL',
  'YouTube or Vimeo URL for the training video (unlisted embed).'
);

// field_category — Entity reference to Training Category taxonomy
if (!FieldStorageConfig::loadByName('node', 'field_category')) {
  FieldStorageConfig::create([
    'field_name' => 'field_category',
    'entity_type' => 'node',
    'type' => 'entity_reference',
    'cardinality' => -1, // unlimited — a module can belong to multiple categories
    'settings' => [
      'target_type' => 'taxonomy_term',
    ],
  ])->save();
  echo "  ✅ Field storage 'field_category' created.\n";
}
if (!FieldConfig::loadByName('node', 'training_module', 'field_category')) {
  FieldConfig::create([
    'field_name' => 'field_category',
    'entity_type' => 'node',
    'bundle' => 'training_module',
    'label' => 'Category',
    'description' => 'Training category (e.g., Phishing, Social Engineering).',
    'required' => FALSE,
    'settings' => [
      'handler' => 'default:taxonomy_term',
      'handler_settings' => [
        'target_bundles' => ['training_category' => 'training_category'],
        'auto_create' => TRUE,
      ],
    ],
  ])->save();
  echo "  ✅ Field instance 'field_category' added to 'training_module'.\n";
}

// field_difficulty — List (text) for difficulty level
if (!FieldStorageConfig::loadByName('node', 'field_difficulty')) {
  FieldStorageConfig::create([
    'field_name' => 'field_difficulty',
    'entity_type' => 'node',
    'type' => 'list_string',
    'cardinality' => 1,
    'settings' => [
      'allowed_values' => [
        'beginner' => 'Beginner',
        'intermediate' => 'Intermediate',
        'advanced' => 'Advanced',
      ],
    ],
  ])->save();
  echo "  ✅ Field storage 'field_difficulty' created.\n";
}
if (!FieldConfig::loadByName('node', 'training_module', 'field_difficulty')) {
  FieldConfig::create([
    'field_name' => 'field_difficulty',
    'entity_type' => 'node',
    'bundle' => 'training_module',
    'label' => 'Difficulty',
    'description' => 'Difficulty level of the training module.',
    'required' => FALSE,
  ])->save();
  echo "  ✅ Field instance 'field_difficulty' added to 'training_module'.\n";
}

// field_duration — Integer field for estimated duration in minutes
ensure_field('node', 'training_module', 'field_duration', 'integer',
  'Duration (minutes)',
  'Estimated time to complete this training module, in minutes.',
  ['unsigned' => TRUE]
);

echo "\n🎉 Training Module content type setup complete.\n";
