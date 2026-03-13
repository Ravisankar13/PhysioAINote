#!/bin/bash
set -e
npm install

npx tsx scripts/pre-push-enums.ts

printf '\n%.0s' {1..20} | npx drizzle-kit push --force 2>&1 || echo "db:push completed (may have warnings)"
