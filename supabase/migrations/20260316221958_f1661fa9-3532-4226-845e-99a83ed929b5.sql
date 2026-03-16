
-- Fix NULL token columns in auth.users that cause scan errors
UPDATE auth.users SET 
  recovery_token = COALESCE(recovery_token, ''),
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE recovery_token IS NULL 
   OR confirmation_token IS NULL 
   OR email_change_token_new IS NULL 
   OR email_change_token_current IS NULL 
   OR reauthentication_token IS NULL;
