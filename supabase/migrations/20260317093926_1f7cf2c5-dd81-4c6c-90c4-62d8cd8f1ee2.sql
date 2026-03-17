
-- Attach handle_new_user trigger to auth.users (profile auto-creation)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Attach auto_enrol_student trigger to applications
CREATE OR REPLACE TRIGGER trg_auto_enrol_student
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enrol_student();

-- Attach notify_on_enrolment trigger to student_enrolments
CREATE OR REPLACE TRIGGER trg_notify_on_enrolment
  AFTER INSERT ON public.student_enrolments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_enrolment();

-- Attach notify_on_grade trigger to submissions
CREATE OR REPLACE TRIGGER trg_notify_on_grade
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_grade();

-- Attach notify_on_invoice trigger to invoices
CREATE OR REPLACE TRIGGER trg_notify_on_invoice
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_invoice();

-- Attach sync_invoice_payment trigger to payments
CREATE OR REPLACE TRIGGER trg_sync_invoice_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_payment();

-- Attach sanitize_student_submission trigger to submissions
CREATE OR REPLACE TRIGGER trg_sanitize_student_submission
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_student_submission();

-- Attach prevent_tenant_id_change to key tables
CREATE OR REPLACE TRIGGER trg_prevent_tenant_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tenant_id_change();

CREATE OR REPLACE TRIGGER trg_prevent_tenant_programmes
  BEFORE UPDATE ON public.programmes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tenant_id_change();

CREATE OR REPLACE TRIGGER trg_prevent_tenant_modules
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tenant_id_change();

CREATE OR REPLACE TRIGGER trg_prevent_tenant_invoices
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tenant_id_change();

-- Attach updated_at triggers
CREATE OR REPLACE TRIGGER trg_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_programmes
  BEFORE UPDATE ON public.programmes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_modules
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_invoices
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_applications
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_assignments
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_payments
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_leave_requests
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_lesson_plans
  BEFORE UPDATE ON public.lesson_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_compliance
  BEFORE UPDATE ON public.compliance_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_health_records
  BEFORE UPDATE ON public.health_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_residential_weeks
  BEFORE UPDATE ON public.residential_weeks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_residential_bookings
  BEFORE UPDATE ON public.residential_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
