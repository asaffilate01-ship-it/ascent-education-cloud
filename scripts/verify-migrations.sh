#!/usr/bin/env bash
set -euo pipefail
command -v supabase >/dev/null || { echo "Supabase CLI required"; exit 2; }
echo "Resetting local database from migrations..."
supabase db reset
echo "Generating schema types..."
supabase gen types typescript --local > /tmp/database.types.ts
test -s /tmp/database.types.ts
echo "Migration replay and type generation succeeded."
echo "Review /tmp/database.types.ts against src/integrations/supabase/types.ts before replacing generated production types."
