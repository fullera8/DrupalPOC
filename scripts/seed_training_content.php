<?php

/**
 * @file
 * Seeds sample Training Module nodes for the DrupalPOC.
 *
 * Run via: ddev drush scr scripts/seed_training_content.php
 */

use Drupal\node\Entity\Node;
use Drupal\taxonomy\Entity\Term;

// Helper: find a taxonomy term by name in training_category vocabulary
function find_term_id($term_name) {
  $terms = \Drupal::entityTypeManager()
    ->getStorage('taxonomy_term')
    ->loadByProperties([
      'vid' => 'training_category',
      'name' => $term_name,
    ]);
  $term = reset($terms);
  return $term ? $term->id() : NULL;
}

$modules = [
  [
    'title' => 'Recognizing Phishing Emails',
    'description' => "Phishing emails are one of the most common cyber threats facing organizations today. In this module, you'll learn how to identify the telltale signs of a phishing attempt — including suspicious sender addresses, urgent language, mismatched URLs, and unexpected attachments.\n\nBy the end of this training, you'll be able to confidently spot phishing emails and know exactly what steps to take to protect yourself and your institution.",
    'video_url' => 'https://www.youtube.com/watch?v=XBkzBrXlle0',
    'category' => 'Phishing Awareness',
    'difficulty' => 'beginner',
    'duration' => 5,
  ],
  [
    'title' => 'Social Engineering: Manipulation Tactics',
    'description' => "Social engineering attacks exploit human psychology rather than technical vulnerabilities. Attackers use techniques like pretexting, baiting, tailgating, and quid pro quo to trick people into revealing sensitive information or granting unauthorized access.\n\nThis module covers the most common social engineering tactics used against university staff and students, with real-world examples and practical defenses you can apply immediately.",
    'video_url' => 'https://www.youtube.com/watch?v=lc7scxvKQOo',
    'category' => 'Social Engineering',
    'difficulty' => 'intermediate',
    'duration' => 8,
  ],
  [
    'title' => 'Password Best Practices & MFA',
    'description' => "Weak passwords remain one of the top entry points for cyberattacks. This module covers modern password best practices — including passphrase strategies, password manager usage, and the critical importance of multi-factor authentication (MFA).\n\nYou'll learn why 'P@ssw0rd123' isn't as secure as you think, how attackers crack passwords, and how MFA adds a vital second layer of protection to your accounts.",
    'video_url' => 'https://www.youtube.com/watch?v=aEmF3Iylvr4',
    'category' => 'Password Hygiene',
    'difficulty' => 'beginner',
    'duration' => 6,
  ],
];

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

  $category_tid = find_term_id($mod['category']);

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
