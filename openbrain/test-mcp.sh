#!/bin/bash
# MCP Server Integration Test Script
set -e

BASE="http://localhost:3000"

echo "=== 1. Health Check ==="
curl -s "$BASE/health"
echo ""
echo ""

echo "=== 2. Initialize MCP Session ==="
curl -s --max-time 15 -D /tmp/mcp-headers.txt -X POST "$BASE/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-client","version":"0.1.0"}}}' \
  > /tmp/mcp-init-response.txt 2>&1 || true

echo "Response:"
cat /tmp/mcp-init-response.txt
echo ""

# Extract session ID from response headers (match ^Mcp-Session-Id: exactly)
SESSION_ID=$(grep -i '^mcp-session-id:' /tmp/mcp-headers.txt | sed 's/.*: //' | tr -d '\r\n')
echo "Session ID: [$SESSION_ID]"
echo ""

if [ -z "$SESSION_ID" ]; then
  echo "ERROR: No session ID received. Headers:"
  cat /tmp/mcp-headers.txt
  exit 1
fi

echo "=== 3. Send initialized notification ==="
curl -s --max-time 5 -X POST "$BASE/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}' || true
echo "OK"
echo ""

echo "=== 4. Test REMEMBER tool ==="
curl -s --max-time 60 -X POST "$BASE/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remember","arguments":{"content":"The TSUS security training platform uses a decoupled Drupal architecture with Angular frontend and .NET 8 API backend.","brain":"brain_default","sourceType":"user_command","createdBy":"test_script"}}}' \
  > /tmp/mcp-remember.txt 2>&1 || true
echo "Remember response:"
cat /tmp/mcp-remember.txt
echo ""
echo ""

echo "=== 5. Test RECALL tool ==="
curl -s --max-time 60 -X POST "$BASE/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"recall","arguments":{"query":"What architecture does the TSUS platform use?","brain":"brain_default","topK":5}}}' \
  > /tmp/mcp-recall.txt 2>&1 || true
echo "Recall response:"
cat /tmp/mcp-recall.txt
echo ""
echo ""

echo "=== 6. Test SEARCH tool ==="
curl -s --max-time 30 -X POST "$BASE/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search","arguments":{"keyword":"Drupal","brain":"brain_default","topK":10}}}' \
  > /tmp/mcp-search.txt 2>&1 || true
echo "Search response:"
cat /tmp/mcp-search.txt
echo ""
echo ""

echo "=== 7. Test FORGET tool (memory ID 1) ==="
curl -s --max-time 30 -X POST "$BASE/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"forget","arguments":{"memoryId":1,"brain":"brain_default"}}}' \
  > /tmp/mcp-forget.txt 2>&1 || true
echo "Forget response:"
cat /tmp/mcp-forget.txt
echo ""
echo ""

echo "=== 8. Verify forgotten memory excluded from search ==="
curl -s --max-time 30 -X POST "$BASE/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"search","arguments":{"keyword":"Drupal","brain":"brain_default","topK":10}}}' \
  > /tmp/mcp-verify.txt 2>&1 || true
echo "Search after forget:"
cat /tmp/mcp-verify.txt
echo ""
echo ""

echo "=== 9. Cleanup: Delete Session ==="
curl -s --max-time 5 -X DELETE "$BASE/mcp" \
  -H "Mcp-Session-Id: $SESSION_ID" || true
echo "Session deleted"
echo ""

echo "=== ALL TESTS COMPLETE ==="
