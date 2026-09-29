// Loose-typed database access for dashboards whose backing tables are
// provisioned separately. Queries degrade gracefully to empty states at
// runtime when a table is not present, while keeping the generated
// Supabase types authoritative for fully wired tables.
import { supabase } from '@/integrations/supabase/client';

type LooseClient = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export const db = supabase as unknown as LooseClient;
