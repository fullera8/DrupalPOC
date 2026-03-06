# =============================================================================
# GoPhish — Phishing Simulation Engine
# =============================================================================
# Upstream image, unmodified. Wrapped in a Dockerfile so we can:
#   1. Tag consistently with other drupalpoc-* images in GHCR
#   2. Layer custom config overrides later (post-POC)
#
# Image: ghcr.io/fullera8/drupalpoc-gophish:latest
# Ports: 3333 (admin UI), 8080 (phishing listener)
# Data:  SQLite (internal, /opt/gophish/gophish.db)
# =============================================================================

FROM gophish/gophish:latest

# GoPhish runs as non-root by default — no changes needed.
# Default config listens on 0.0.0.0:3333 (admin) and 0.0.0.0:8080 (phish).

EXPOSE 3333 8080
