#!/bin/sh
set -e

echo "==> Starting FinanceOps Command Center..."

# If DATABASE_URL is provided, sync the database schema
if [ -n "$DATABASE_URL" ]; then
  echo "==> Pushing Prisma schema to database..."
  if [ -f "./node_modules/.bin/prisma" ]; then
    ./node_modules/.bin/prisma db push --skip-generate || echo "Warning: prisma db push returned non-zero, continuing..."
  else
    npx prisma db push --skip-generate || echo "Warning: npx prisma db push returned non-zero, continuing..."
  fi

  # If AUTO_SEED is enabled, run seed script
  if [ "$AUTO_SEED" = "true" ] || [ "$SEED_ON_START" = "true" ]; then
    echo "==> Running database seed..."
    if [ -f "./node_modules/.bin/tsx" ]; then
      ./node_modules/.bin/tsx prisma/seed.ts || echo "Warning: seed script returned non-zero, continuing..."
    else
      npx tsx prisma/seed.ts || echo "Warning: npx tsx seed script returned non-zero, continuing..."
    fi
  fi
fi

echo "==> Launching Next.js standalone server on port ${PORT:-3000}..."
exec "$@"
