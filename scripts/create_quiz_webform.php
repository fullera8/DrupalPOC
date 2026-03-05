<?php

/**
 * @file
 * Creates a sample phishing awareness quiz via Webform.
 *
 * Run via: ddev drush scr scripts/create_quiz_webform.php
 */

use Drupal\webform\Entity\Webform;

$webform_id = 'phishing_awareness_quiz';

if (Webform::load($webform_id)) {
  echo "ℹ️ Webform '$webform_id' already exists.\n";
  return;
}

$webform = Webform::create([
  'id' => $webform_id,
  'title' => 'Phishing Awareness Quiz',
  'description' => 'Test your knowledge of phishing attacks and how to identify suspicious emails.',
  'status' => 'open',
  'elements' => <<<YAML
question_1:
  '#type': radios
  '#title': 'You receive an email from "IT Support" asking you to click a link and verify your password. What should you do?'
  '#options':
    a: 'Click the link — IT Support needs my password'
    b: 'Reply with your password so they can verify it'
    c: 'Report the email as suspicious and do NOT click the link'
    d: 'Forward the email to your coworkers for their opinion'
  '#required': true

question_2:
  '#type': radios
  '#title': 'Which of the following is a common sign of a phishing email?'
  '#options':
    a: 'The email comes from a known colleague'
    b: 'The email has no spelling errors'
    c: 'The sender address looks slightly different from the official domain'
    d: 'The email was sent during business hours'
  '#required': true

question_3:
  '#type': radios
  '#title': 'What is "spear phishing"?'
  '#options':
    a: 'A type of fishing sport'
    b: 'A phishing attack targeted at a specific individual or organization'
    c: 'Sending the same phishing email to millions of people'
    d: 'A type of firewall protection'
  '#required': true

question_4:
  '#type': radios
  '#title': 'You receive an urgent email from your "bank" saying your account will be locked unless you verify your identity immediately. What is the best action?'
  '#options':
    a: 'Click the link immediately to avoid being locked out'
    b: 'Call your bank directly using the number on their official website'
    c: 'Reply to the email with your account details'
    d: 'Ignore it — banks never send emails'
  '#required': true

question_5:
  '#type': radios
  '#title': 'Which URL is most likely a phishing attempt?'
  '#options':
    a: 'https://www.bankofamerica.com/login'
    b: 'https://www.bankofamerica.secure-login.com/verify'
    c: 'https://login.bankofamerica.com'
    d: 'https://www.bankofamerica.com/security'
  '#required': true

score_display:
  '#type': 'webform_computed_twig'
  '#title': 'Your Score'
  '#display_on': 'none'
  '#mode': 'text'
  '#template': |
    {% set correct = 0 %}
    {% if data.question_1 == 'c' %}{% set correct = correct + 1 %}{% endif %}
    {% if data.question_2 == 'c' %}{% set correct = correct + 1 %}{% endif %}
    {% if data.question_3 == 'b' %}{% set correct = correct + 1 %}{% endif %}
    {% if data.question_4 == 'b' %}{% set correct = correct + 1 %}{% endif %}
    {% if data.question_5 == 'b' %}{% set correct = correct + 1 %}{% endif %}
    {{ correct }} out of 5

actions:
  '#type': webform_actions
  '#title': 'Submit'
  '#submit__label': 'Submit Quiz'
YAML,
  'settings' => [
    'confirmation_type' => 'message',
    'confirmation_message' => 'Thank you for completing the Phishing Awareness Quiz! Your responses have been recorded.',
  ],
]);

$webform->save();
echo "✅ Webform '$webform_id' created with 5 multiple-choice questions.\n";
echo "   Answer key: Q1=c, Q2=c, Q3=b, Q4=b, Q5=b\n";
