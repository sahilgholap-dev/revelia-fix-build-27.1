#!/bin/bash

echo "=== Revelia Mobile - Project Verification ==="
echo ""

# Check critical files
echo "Checking critical files..."
files=(
  "package.json"
  "app.json"
  "tsconfig.json"
  "tailwind.config.js"
  "babel.config.js"
  "metro.config.js"
  "README.md"
  "app/_layout.tsx"
  "app/index.tsx"
  "lib/api.ts"
  "lib/colors.ts"
  "lib/constants.ts"
  "store/authStore.ts"
  "store/userStore.ts"
  "hooks/useAuth.ts"
  "components/ui/Button.tsx"
  "components/ui/Card.tsx"
  "components/ui/Input.tsx"
  "components/ui/LoadingSpinner.tsx"
)

missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file MISSING"
    missing=$((missing + 1))
  fi
done

echo ""
echo "Checking screen files..."
screens=(
  "app/(auth)/welcome.tsx"
  "app/(auth)/login.tsx"
  "app/(auth)/signup.tsx"
  "app/(main)/home.tsx"
  "app/(main)/profile.tsx"
  "app/(capture)/face-capture.tsx"
  "app/(capture)/palm-capture.tsx"
  "app/(paywall)/index.tsx"
)

for screen in "${screens[@]}"; do
  if [ -f "$screen" ]; then
    echo "✅ $screen"
  else
    echo "❌ $screen MISSING"
    missing=$((missing + 1))
  fi
done

echo ""
echo "Checking assets..."
assets=(
  "assets/icon.png"
  "assets/splash.png"
  "assets/adaptive-icon.png"
  "assets/favicon.png"
)

for asset in "${assets[@]}"; do
  if [ -f "$asset" ]; then
    echo "✅ $asset"
  else
    echo "❌ $asset MISSING"
    missing=$((missing + 1))
  fi
done

echo ""
echo "=== Summary ==="
if [ $missing -eq 0 ]; then
  echo "✅ All files present!"
  echo "✅ Project structure complete!"
  exit 0
else
  echo "❌ $missing files missing"
  exit 1
fi
