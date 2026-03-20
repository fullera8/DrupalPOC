<?php

/**
 * @file
 * Seeds sample Training Module nodes for the DrupalPOC.
 *
 * Run via: ddev drush scr scripts/seed_training_content.php
 */

use Drupal\node\Entity\Node;
use Drupal\taxonomy\Entity\Term;

// Helper: find or create a taxonomy term in training_category vocabulary
function find_or_create_term_id($term_name) {
  $terms = \Drupal::entityTypeManager()
    ->getStorage('taxonomy_term')
    ->loadByProperties([
      'vid' => 'training_category',
      'name' => $term_name,
    ]);
  $term = reset($terms);
  if ($term) {
    return $term->id();
  }
  // Term doesn't exist — create it
  $new_term = Term::create([
    'vid' => 'training_category',
    'name' => $term_name,
  ]);
  $new_term->save();
  echo "📁 Created category term: '$term_name' (tid: {$new_term->id()})\n";
  return $new_term->id();
}

$modules = [
  [
    'title' => 'Foundations of Phishing Awareness',
    'description' => "Core training for recognizing and reporting email-based threats.",
    'video_url' => 'https://www.youtube.com/watch?v=gWGhUdHItto',
    'category' => 'Phishing Awareness',
    'difficulty' => 'beginner',
    'duration' => 8,
  ],
  [
    'title' => 'Advanced Social Engineering',
    'description' => "Deep-dive into pretexting, vishing, and multi-vector attack scenarios.",
    'video_url' => 'https://www.youtube.com/watch?v=uMkOphesrqI',
    'category' => 'Social Engineering',
    'difficulty' => 'intermediate',
    'duration' => 15,
  ],
  [
    'title' => 'Password Best Practices & MFA',
    'description' => "Weak passwords remain one of the top entry points for cyberattacks. This module covers modern password best practices — including passphrase strategies, password manager usage, and the critical importance of multi-factor authentication (MFA).\n\nYou'll learn why 'P@ssw0rd123' isn't as secure as you think, how attackers crack passwords, and how MFA adds a vital second layer of protection to your accounts.",
    'video_url' => 'https://www.youtube.com/watch?v=xUp5S0nBnfc',
    'category' => 'Password Hygiene',
    'difficulty' => 'beginner',
    'duration' => 3,
  ],
];

// ── Step 1: Delete ALL existing training_module nodes ──
$existing_nids = \Drupal::entityTypeManager()
  ->getStorage('node')
  ->getQuery()
  ->accessCheck(FALSE)
  ->condition('type', 'training_module')
  ->execute();

if (!empty($existing_nids)) {
  $existing_nodes = Node::loadMultiple($existing_nids);
  foreach ($existing_nodes as $node) {
    echo "🗑️ Deleted: '{$node->getTitle()}' (nid: {$node->id()})\n";
    $node->delete();
  }
  echo "Removed " . count($existing_nids) . " old module(s).\n\n";
}

// ── Step 2: Create new modules ──

$created = 0;
foreach ($modules as $mod) {
  // Check if a node with this title already exists
  $existing = \Drupal::entityTypeManager()
    ->getStorage('node')
    ->loadByProperties([
      'type' => 'training_module',
      'title' => $mod['title'],
    ]);

  if (!empty($existing)) {
    echo "ℹ️ '{$mod['title']}' already exists — skipping.\n";
    continue;
  }

  $category_tid = find_or_create_term_id($mod['category']);

  $node = Node::create([
    'type' => 'training_module',
    'title' => $mod['title'],
    'status' => 1, // Published
    'field_description' => [
      'value' => $mod['description'],
      'format' => 'basic_html',
    ],
    'field_video_url' => [
      'uri' => $mod['video_url'],
      'title' => $mod['title'] . ' - Training Video',
    ],
    'field_category' => $category_tid ? [['target_id' => $category_tid]] : [],
    'field_difficulty' => $mod['difficulty'],
    'field_duration' => $mod['duration'],
  ]);
  $node->save();
  $created++;
  echo "✅ Created: '{$mod['title']}' (nid: {$node->id()})\n";
}

echo "\n🎉 Seeded $created training module(s).\n";
