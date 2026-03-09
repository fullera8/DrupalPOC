<?php

namespace Drupal\mailpit_link\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Routing\TrustedRedirectResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Redirects to the Mailpit/Mailhog UI.
 *
 * Environment-aware: uses MAILPIT_URL env var when set (e.g. AKS),
 * falls back to <current-host>:8025 for DDEV local development.
 */
class MailpitRedirectController extends ControllerBase {

  protected RequestStack $requestStack;

  public function __construct(RequestStack $request_stack) {
    $this->requestStack = $request_stack;
  }

  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('request_stack'),
    );
  }

  public function redirectToMailpit(): TrustedRedirectResponse|array {
    $mailpitUrl = getenv('MAILPIT_URL');

    if ($mailpitUrl && $mailpitUrl !== '') {
      if ($mailpitUrl === 'disabled') {
        return [
          '#markup' => '<p>Mailpit is not available in this environment. '
            . 'Mailpit/Mailhog is a local development tool for capturing emails. '
            . 'In production, emails are sent via a real SMTP server.</p>',
        ];
      }
      return new TrustedRedirectResponse($mailpitUrl);
    }

    // Default: DDEV local development — Mailhog on same host, port 8025.
    $request = $this->requestStack->getCurrentRequest();
    $host = $request->getHost();
    $url = 'http://' . $host . ':8025';
    return new TrustedRedirectResponse($url);
  }

}
