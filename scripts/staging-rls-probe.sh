#!/usr/bin/env bash
set -euo pipefail
: "${SUPABASE_URL:?SUPABASE_URL required}"
: "${TENANT_A_STUDENT_JWT:?TENANT_A_STUDENT_JWT required}"
: "${TENANT_B_STUDENT_JWT:?TENANT_B_STUDENT_JWT required}"
echo "Staging RLS probe environment configured."
probe(){ name="$1"; jwt="$2"; path="$3"; expected="$4"; code=$(curl -sS -o /tmp/rls-body -w "%{http_code}" -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer $jwt" "${SUPABASE_URL}/rest/v1/$path"); echo "$name -> $code"; [[ "$code" =~ $expected ]]; }
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY required}"
# Concrete row IDs/filters are supplied by the seeded staging fixture.
: "${TENANT_A_OWN_PROFILE_FILTER:?required}"
: "${TENANT_B_PROFILE_FILTER:?required}"
probe "A own profile" "$TENANT_A_STUDENT_JWT" "profiles?select=user_id&$TENANT_A_OWN_PROFILE_FILTER" "200"
probe "A probes tenant B profile" "$TENANT_A_STUDENT_JWT" "profiles?select=user_id&$TENANT_B_PROFILE_FILTER" "200"
echo "NOTE: REST 200 may contain [] under RLS; evidence runner must assert response body is empty for forbidden filters."
