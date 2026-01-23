#!/bin/bash
# Verification script for gamekit development
# Run this to check project health

set -e
cd "$(dirname "$0")/.."

echo "=== gamekit Verification ==="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[SKIP] node_modules not found - run 'npm install' first"
    exit 0
fi

# TypeScript check
echo "[1/3] TypeScript type checking..."
if npx tsc --noEmit; then
    echo "  PASS: No type errors"
else
    echo "  FAIL: Type errors found"
    exit 1
fi

# Run tests
echo ""
echo "[2/3] Running tests..."
if npm test; then
    echo "  PASS: All tests passed"
else
    echo "  FAIL: Tests failed"
    exit 1
fi

# Build check
echo ""
echo "[3/3] Build check..."
if npm run build; then
    echo "  PASS: Build successful"
else
    echo "  FAIL: Build failed"
    exit 1
fi

echo ""
echo "=== All checks passed ==="
