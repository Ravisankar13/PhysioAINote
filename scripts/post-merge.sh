#!/bin/bash
set -e
npm install

npx tsx scripts/pre-push-enums.ts

expect scripts/drizzle-push-auto.exp
