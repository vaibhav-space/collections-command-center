#!/bin/sh
set -e

echo "==> Starting FinanceOps Command Center..."

# If DATABASE_URL is provided, sync the database schema
if [ -n "$DATABASE_URL" ]; then
  echo "==> Pushing Prisma schema to database..."
  prisma db push --skip-generate || echo "Warning: prisma db push returned non-zero, continuing..."

  # If AUTO_SEED is enabled, run seed script
  if [ "$AUTO_SEED" = "true" ] || [ "$SEED_ON_START" = "true" ]; then
    echo "==> Running database seed..."
    if [ -f "./prisma/seed.cjs" ]; then
      node prisma/seed.cjs || echo "Warning: seed script returned non-zero, continuing..."
    elif [ -f "./prisma/seed.ts" ]; then
      npx tsx prisma/seed.ts || echo "Warning: npx tsx seed script returned non-zero, continuing..."
    fi
  fi
fi

echo "==> Launching Next.js standalone server on port ${PORT:-3000}..."
exec "$@"
