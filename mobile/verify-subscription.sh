#!/bin/bash

echo "=== Revelia Subscription Implementation Verification ==="
echo ""

# Check files exist
echo "Checking files..."
files=(
  "lib/revenuecat.ts"
  "services/subscription.service.ts"
  "store/subscriptionStore.ts"
  "hooks/usePaywall.ts"
  "components/subscription/PremiumBadge.tsx"
  "components/subscription/LockedOverlay.tsx"
  "components/subscription/FeatureComparisonTable.tsx"
  "app/(paywall)/_layout.tsx"
  "app/(paywall)/index.tsx"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file - MISSING"
    all_exist=false
  fi
done

echo ""
echo "Checking package.json..."
if grep -q "react-native-purchases" package.json; then
  echo "✅ react-native-purchases dependency added"
else
  echo "❌ react-native-purchases dependency missing"
  all_exist=false
fi

echo ""
echo "Checking TypeScript compilation..."
if yarn type-check > /dev/null 2>&1; then
  echo "✅ TypeScript check passed"
else
  echo "❌ TypeScript errors found"
  all_exist=false
fi

echo ""
if [ "$all_exist" = true ]; then
  echo "🎉 All checks passed! Implementation complete."
  echo ""
  echo "Next steps:"
  echo "1. Configure RevenueCat dashboard"
  echo "2. Add API keys to .env file"
  echo "3. Test purchase flow"
  echo ""
  echo "See SUBSCRIPTION_QUICKSTART.md for details"
else
  echo "⚠️  Some checks failed. Please review above."
fi
