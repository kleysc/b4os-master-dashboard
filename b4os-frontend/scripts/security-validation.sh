#!/bin/bash
set -e

# Security validation script - Bitcoin Core level
echo "Running security validation checks..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_fail() { echo -e "${RED}[FAIL]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

VIOLATIONS=0

# 1. SECRET SCANNING - Critical patterns
echo "Checking for exposed secrets..."
SECRET_PATTERNS=(
    "GITHUB_SECRET=\w+"
    "NEXTAUTH_SECRET=\w+"
    "SUPABASE_SERVICE_ROLE_KEY=\w+"
    "-----BEGIN.*PRIVATE KEY-----"
    "sk_live_\w+"
    "pk_live_\w+"
    "access_token.*=.*['\"][^'\"]{20,}['\"]"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if git diff --cached | grep -E "$pattern" >/dev/null 2>&1; then
        print_fail "Potential secret detected: $pattern"
        ((VIOLATIONS++))
    fi
done

# 2. API RESPONSE VALIDATION - Check endpoints don't leak sensitive data
echo "Validating API response sanitization..."
npm run dev &
DEV_PID=$!
sleep 3

# Test endpoints for data leakage
ENDPOINTS=(
    "/api/auth/session"
    "/api/auth/providers"
)

for endpoint in "${ENDPOINTS[@]}"; do
    response=$(curl -s "http://localhost:3000$endpoint" || echo "")

    # Skip validation if endpoint returns 404 or HTML error pages
    if echo "$response" | grep -E "(404|This page could not be found|<!DOCTYPE html)" >/dev/null 2>&1; then
        continue
    fi

    # Check for sensitive data patterns in responses
    if echo "$response" | grep -E "(password|secret|key|token|private)" >/dev/null 2>&1; then
        print_fail "Sensitive data detected in $endpoint response"
        echo "Response: $response"
        ((VIOLATIONS++))
    fi

    # Check for full user objects (should be sanitized)
    if echo "$response" | grep -E "(email.*@.*\.|github_id.*[0-9]{8,})" >/dev/null 2>&1; then
        print_warn "Potentially sensitive user data in $endpoint"
        echo "Consider sanitizing: $response"
    fi
done

kill $DEV_PID 2>/dev/null

# 3. ENVIRONMENT VARIABLE VALIDATION
echo "Checking environment variable security..."
if [ -f .env.local ]; then
    # Check if .env.local is accidentally staged
    if git diff --cached --name-only | grep -q "\.env\.local"; then
        print_fail ".env.local is staged for commit - this exposes secrets"
        ((VIOLATIONS++))
    fi

    # Check for weak secrets
    NEXTAUTH_SECRET_FROM_FILE=$(grep "^NEXTAUTH_SECRET=" .env.local | cut -d'=' -f2 | tr -d '"')
    if [ -n "$NEXTAUTH_SECRET_FROM_FILE" ] && [ ${#NEXTAUTH_SECRET_FROM_FILE} -lt 32 ]; then
        print_warn "NEXTAUTH_SECRET should be at least 32 characters (current: ${#NEXTAUTH_SECRET_FROM_FILE})"
    fi
fi

# 4. DATABASE QUERY VALIDATION
echo "Checking for SQL injection vulnerabilities..."
if grep -r "SELECT.*\${" src/ 2>/dev/null | grep -v node_modules; then
    print_fail "Potential SQL injection vulnerability found (string interpolation)"
    ((VIOLATIONS++))
fi

# Check for raw queries without parameterization
if grep -r "\.query\|\.raw\|SELECT.*+" src/ 2>/dev/null | grep -v node_modules; then
    print_warn "Raw SQL queries detected - ensure they use parameterized queries"
fi

# 5. AUTHORIZATION BYPASS CHECKS
echo "Checking authorization logic..."
auth_files=$(find src/ -name "*.ts" -o -name "*.tsx" | xargs grep -l "isAuthorized\|checkUser\|session\." || true)

for file in $auth_files; do
    # Check for direct role assignments without validation (exclude helper functions)
    if grep -n "role.*=.*['\"]admin['\"]" "$file" | grep -v "authResult\|authorized\|role === 'admin'\|=== 'admin'\|== 'admin'"; then
        print_fail "Hardcoded admin role assignment found in $file"
        ((VIOLATIONS++))
    fi

    # Check for missing authorization checks
    if grep -n "useSession\|getSession" "$file" | head -1 >/dev/null; then
        if ! grep -q "isAuthorized\|authorized" "$file"; then
            print_warn "File uses session but may be missing authorization check: $file"
        fi
    fi
done

# 6. CLIENT-SIDE DATA EXPOSURE
echo "Checking for client-side data exposure..."
if grep -r "console\.log.*session\|console\.log.*user\|console\.log.*token" src/ | grep -v "// DEBUG" | head -5; then
    print_warn "Console.log statements may expose sensitive data in production"
fi

# 7. DEPENDENCY VULNERABILITIES
echo "Checking dependencies for known vulnerabilities..."
if command -v npm >/dev/null; then
    if npm audit --audit-level high 2>&1 | grep -q "found.*vulnerabilities"; then
        print_fail "High/critical vulnerabilities found in dependencies"
        ((VIOLATIONS++))
    fi
fi

# Results
echo "----------------------------------------"
if [ $VIOLATIONS -eq 0 ]; then
    print_pass "Security validation passed - no critical issues found"
    exit 0
else
    print_fail "Security validation failed - $VIOLATIONS critical issues found"
    echo "Fix security issues before committing"
    exit 1
fi