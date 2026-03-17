CREATE OR REPLACE FUNCTION public.notify_on_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.student_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, tenant_id, title, message, type, severity)
    VALUES (NEW.student_id, NEW.tenant_id, 'New Invoice', 'A ' || NEW.type || ' invoice of Rs.' || NEW.amount || ' has been raised.', 'finance', 'warning');
  END IF;
  RETURN NEW;
END;
$function$;