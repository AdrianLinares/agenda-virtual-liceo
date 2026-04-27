#!/bin/bash

# Script to seed Supabase database with schema and test data
# Usage: ./seed_supabase.sh [supabase-url] [service-role-key]

set -e

# Check if required tools are available
command -v psql >/dev/null 2>&1 || { echo "Error: psql is not installed. Please install PostgreSQL client."; exit 1; }

# Get Supabase URL and service role key
SUPABASE_URL="${1:-$SUPABASE_DB_URL}"
SERVICE_ROLE_KEY="${2:-$SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ]; then
  echo "Error: Supabase URL not provided. Set SUPABASE_DB_URL environment variable or pass as first argument."
  exit 1
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "Error: Service role key not provided. Set SUPABASE_SERVICE_ROLE_KEY environment variable or pass as second argument."
  exit 1
fi

# Extract database URL from Supabase URL
# Supabase provides database URL in the format: postgresql://postgres:[password]@[host]:5432/postgres
# But for direct connection, we need to construct it from the URL and service key

# Parse Supabase URL to get project ref
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\..*|\1|')

if [ -z "$PROJECT_REF" ]; then
  echo "Error: Could not extract project ref from Supabase URL: $SUPABASE_URL"
  exit 1
fi

# Construct database URL
DB_URL="postgresql://postgres:$SERVICE_ROLE_KEY@db.$PROJECT_REF.supabase.co:5432/postgres"

echo "Seeding database for project: $PROJECT_REF"
echo "Using database URL: $DB_URL"

# Apply schema
echo "Applying supabase-schema.sql..."
if [ -f "supabase-schema.sql" ]; then
  psql "$DB_URL" -f supabase-schema.sql
  echo "Schema applied successfully."
else
  echo "Warning: supabase-schema.sql not found in current directory."
fi

# Alternative: using Supabase CLI if available
if command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI detected. You can also use:"
  echo "supabase db reset --linked"
  echo "or"
  echo "supabase db push"
else
  echo "For CLI-based seeding, install Supabase CLI:"
  echo "npm install -g supabase"
fi

echo "Database seeding completed."