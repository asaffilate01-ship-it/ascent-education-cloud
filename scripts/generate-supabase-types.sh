#!/usr/bin/env bash
set -euo pipefail
command -v supabase >/dev/null 2>&1 || { echo "Supabase CLI required"; exit 2; }
mkdir -p src/integrations/supabase
supabase gen types typescript --local > src/integrations/supabase/types.generated.ts
echo "Generated Supabase types"
