#!/bin/bash

echo "🔧 Checking dependencies..."

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/tsx" ]; then
    echo "📦 Installing dependencies (this may take a few minutes)..."
    npm install --no-audit --no-fund --prefer-offline
    echo "✅ Dependencies installed!"
else
    echo "✅ Dependencies already installed"
fi

echo "🚀 Starting development server..."
npm run dev