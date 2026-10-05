#!/usr/bin/env bash
set -euo pipefail
command -v supabase >/dev/null || { echo "Supabase CLI required"; exit 2; }
echo "Resetting local database and replaying every migration..."
supabase db reset
echo "Migration replay completed. Generate types next:"
echo "supabase gen types typescript --local > src/integrations/supabase/types.generated.ts"
