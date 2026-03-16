
-- PHASE 30: Restore ALL triggers (fixed)

-- 1. on_auth_user_created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. prevent_tenant_id_change on profiles
CREATE OR REPLACE TRIGGER prevent_tenant_id_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_id_change();

-- 3. sanitize_student_submission
CREATE OR REPLACE TRIGGER sanitize_student_submission
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_student_submission();

-- 4. auto_enrol_on_enrolled
CREATE OR REPLACE TRIGGER auto_enrol_on_enrolled
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.auto_enrol_student();

-- 5-14. updated_at triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_programmes_updated_at BEFORE UPDATE ON public.programmes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_enrolments_updated_at BEFORE UPDATE ON public.student_enrolments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Notification on enrolment
CREATE OR REPLACE FUNCTION public.notify_on_enrolment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, tenant_id, title, message, type, severity)
  VALUES (NEW.student_id, NEW.tenant_id, 'You are now enrolled!', 'Congratulations — your enrolment has been confirmed.', 'academic', 'success');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER notify_student_on_enrolment
  AFTER INSERT ON public.student_enrolments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_enrolment();

-- 16. Notification on grade
CREATE OR REPLACE FUNCTION public.notify_on_grade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.grade IS NOT NULL AND (OLD.grade IS NULL OR OLD.grade IS DISTINCT FROM NEW.grade) THEN
    INSERT INTO public.notifications (user_id, tenant_id, title, message, type, severity)
    VALUES (NEW.student_id, NEW.tenant_id, 'Grade Released', 'Your submission has been graded: ' || NEW.grade || '%', 'academic', 'info');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER notify_student_on_grade
  AFTER UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_grade();

-- 17. Notification on invoice
CREATE OR REPLACE FUNCTION public.notify_on_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.student_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, tenant_id, title, message, type, severity)
    VALUES (NEW.student_id, NEW.tenant_id, 'New Invoice', 'A ' || NEW.type || ' invoice of £' || NEW.amount || ' has been raised.', 'finance', 'warning');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER notify_student_on_invoice
  AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice();
