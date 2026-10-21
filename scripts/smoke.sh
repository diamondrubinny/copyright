#!/usr/bin/env bash
# Smoke tests against a running server. Usage: BASE=http://localhost:3000 ./scripts/smoke.sh
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"
pass=0; fail=0
check() { if eval "$2"; then echo "  ✓ $1"; pass=$((pass+1)); else echo "  ✗ $1"; fail=$((fail+1)); fi; }

echo "== health =="
check "health ok" '[ "$(curl -s "$BASE/api/health" | grep -c \"ok\")" -ge 1 ]'

echo "== k-anonymity range =="
# SHA1("P@ssw0rd") = 21BD12DC183F740EE76F27B78EB39C8AD972A757 -> prefix 21BD1
check "valid prefix returns data" '[ "$(curl -s "$BASE/api/pwned-range?prefix=21BD1" | wc -l)" -gt 10 ]'
check "bad prefix rejected (400)" '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/pwned-range?prefix=ZZ")" = "400" ]'

echo "== email check =="
check "valid email 200" '[ "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/email-check" -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\"}")" = "200" ]'
check "bad email 400" '[ "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/email-check" -H "Content-Type: application/json" -d "{\"email\":\"nope\"}")" = "400" ]'

echo "== security headers =="
check "CSP present" 'curl -sI "$BASE/" | grep -qi "content-security-policy"'
check "nosniff present" 'curl -sI "$BASE/" | grep -qi "x-content-type-options: nosniff"'

echo ""
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
