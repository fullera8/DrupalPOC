#!/bin/sh
# =============================================================================
# GoPhish Campaign Seeder — POC
# =============================================================================
# Seeds GoPhish with a minimal phishing simulation campaign for the POC demo.
# Run inside a pod that can reach gophish-service.drupalpoc:3333 (e.g., Drupal pod).
#
# Creates: 1 sending profile, 1 email template, 1 landing page, 1 group, 1 campaign
# =============================================================================

GP_URL="${GP_URL:-https://gophish-service.drupalpoc:3333}"
API_KEY="${GP_API_KEY:?Error: GP_API_KEY environment variable is required}"
LOG="/tmp/gp_seed.log"
rm -f "$LOG"

api() {
  METHOD=$1; ENDPOINT=$2; DATA=$3
  curl -sk -X "$METHOD" \
    "$GP_URL/api/${ENDPOINT}/?api_key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d "$DATA" 2>/dev/null
}

echo "=== GoPhish Campaign Seeder ===" >> "$LOG"

# 1. Create Sending Profile (SMTP configuration)
echo "--- Creating Sending Profile ---" >> "$LOG"
SMTP_RESP=$(api POST smtp '{
  "name": "TSUS IT Helpdesk",
  "host": "localhost:25",
  "from_address": "helpdesk@tsus.edu",
  "ignore_cert_errors": true
}')
SMTP_ID=$(echo "$SMTP_RESP" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
echo "SMTP_ID=$SMTP_ID" >> "$LOG"
echo "$SMTP_RESP" >> "$LOG"

# 2. Create Email Template
echo "--- Creating Email Template ---" >> "$LOG"
TMPL_RESP=$(api POST templates '{
  "name": "Password Reset Required",
  "subject": "Action Required: Your TSUS Account Password Expires Today",
  "html": "<html><body style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;\"><div style=\"background:#003366;color:white;padding:20px;text-align:center;\"><h2>Texas State University System</h2><p>Information Security Office</p></div><div style=\"padding:20px;border:1px solid #ddd;\"><p>Dear {{.FirstName}} {{.LastName}},</p><p>Our records indicate that your TSUS account password is set to expire <strong>today</strong>. To avoid losing access to university systems, please verify your credentials immediately.</p><p style=\"text-align:center;margin:24px 0;\"><a href=\"{{.URL}}\" style=\"background:#cc0000;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;\">Verify Account Now</a></p><p style=\"font-size:12px;color:#888;\">This is an automated security notification from the TSUS Information Security Office. If you believe this is an error, contact the helpdesk at helpdesk@tsus.edu.</p></div></body></html>",
  "text": "Dear {{.FirstName}} {{.LastName}},\n\nYour TSUS account password expires today. Verify your credentials at: {{.URL}}\n\nTSUS Information Security Office"
}')
TMPL_ID=$(echo "$TMPL_RESP" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
echo "TMPL_ID=$TMPL_ID" >> "$LOG"
echo "$TMPL_RESP" >> "$LOG"

# 3. Create Landing Page (captures credentials)
echo "--- Creating Landing Page ---" >> "$LOG"
PAGE_RESP=$(api POST pages '{
  "name": "TSUS Login Portal",
  "html": "<html><body style=\"font-family:Arial,sans-serif;max-width:400px;margin:40px auto;text-align:center;\"><div style=\"background:#003366;color:white;padding:20px;\"><h2>TSUS Single Sign-On</h2></div><div style=\"padding:20px;border:1px solid #ddd;\"><p>Enter your TSUS credentials to verify your account.</p><form method=\"POST\"><input name=\"username\" type=\"text\" placeholder=\"TSUS Username\" style=\"width:100%;padding:10px;margin:8px 0;box-sizing:border-box;\"/><input name=\"password\" type=\"password\" placeholder=\"Password\" style=\"width:100%;padding:10px;margin:8px 0;box-sizing:border-box;\"/><button type=\"submit\" style=\"background:#003366;color:white;padding:12px;width:100%;border:none;cursor:pointer;font-size:16px;\">Sign In</button></form></div><p style=\"font-size:12px;color:#888;margin-top:20px;\">Protected by TSUS Information Security</p></body></html>",
  "capture_credentials": true,
  "capture_passwords": false,
  "redirect_url": "https://www.tsus.edu"
}')
PAGE_ID=$(echo "$PAGE_RESP" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
echo "PAGE_ID=$PAGE_ID" >> "$LOG"
echo "$PAGE_RESP" >> "$LOG"

# 4. Create User Group (demo users)
echo "--- Creating User Group ---" >> "$LOG"
GROUP_RESP=$(api POST groups '{
  "name": "TSUS Security Training Demo",
  "targets": [
    {"first_name": "Alice", "last_name": "Johnson", "email": "alice.johnson@tsus.edu", "position": "Faculty"},
    {"first_name": "Bob", "last_name": "Smith", "email": "bob.smith@tsus.edu", "position": "Staff"},
    {"first_name": "Carol", "last_name": "Williams", "email": "carol.williams@tsus.edu", "position": "Student"},
    {"first_name": "David", "last_name": "Brown", "email": "david.brown@tsus.edu", "position": "Administrator"},
    {"first_name": "Eve", "last_name": "Davis", "email": "eve.davis@tsus.edu", "position": "Faculty"}
  ]
}')
GROUP_ID=$(echo "$GROUP_RESP" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
echo "GROUP_ID=$GROUP_ID" >> "$LOG"
echo "$GROUP_RESP" >> "$LOG"

# 5. Create Campaign
echo "--- Creating Campaign ---" >> "$LOG"
CAMPAIGN_RESP=$(api POST campaigns '{"name":"Q1 2026 Phishing Simulation - Password Reset","template":{"name":"Password Reset Required"},"page":{"name":"TSUS Login Portal"},"smtp":{"name":"TSUS IT Helpdesk"},"groups":[{"name":"TSUS Security Training Demo"}],"launch_date":"2026-03-08T10:00:00+00:00","send_by_date":"2026-03-08T12:00:00+00:00","url":"http://20.85.112.48"}')
CAMPAIGN_ID=$(echo "$CAMPAIGN_RESP" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
echo "CAMPAIGN_ID=$CAMPAIGN_ID" >> "$LOG"
echo "$CAMPAIGN_RESP" >> "$LOG"

echo "=== SEED COMPLETE ===" >> "$LOG"
echo "SMTP_ID=$SMTP_ID TMPL_ID=$TMPL_ID PAGE_ID=$PAGE_ID GROUP_ID=$GROUP_ID CAMPAIGN_ID=$CAMPAIGN_ID" >> "$LOG"
