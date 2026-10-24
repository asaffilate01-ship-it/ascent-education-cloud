
-- 1. Re-create the auth trigger that was missing
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
