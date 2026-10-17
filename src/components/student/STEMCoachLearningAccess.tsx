import { useEffect, useState } from "react";
import { GraduationCap, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { stemcoachCentreJoinUrl } from "@/lib/stemcoachCentreLink";

/**
 * Verified centre navigation only. UniPathway's academic/regulated results
 * remain in UniPathway; this component cannot send grades or award access.
 */
export default function STEMCoachLearningAccess({ enrolled }: { enrolled: boolean }) {
  const { user } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    if (!user || !user.tenantId || !enrolled) {
      setSlug(null);
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setSlug(null);
    const load = async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_stemcoach_centre_link");
      if (cancelled) return;
      if (!error && Array.isArray(data) && typeof data[0]?.stemcoach_slug === "string") {
        setSlug(data[0].stemcoach_slug);
      }
      setStatus("ready");
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id, user?.tenantId, enrolled]);

  const destination = slug ? stemcoachCentreJoinUrl(slug, import.meta.env.VITE_STEMCOACH_APP_URL) : null;
  return (
    <section aria-labelledby="stemcoach-access-title" className="surface-card p-5 mb-6">
      <h2 id="stemcoach-access-title" className="flex items-center gap-2 text-base font-semibold">
        <GraduationCap className="h-5 w-5 text-primary" /> STEMCoach revision and practice
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Use interactive questions, diagnostics and personalised revision for eligible
        school-level tuition subjects. OTHM, Qualifi and other regulated
        assessments remain within UniPathway's human-controlled academic system.
      </p>
      {status === "loading" ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">Checking your centre connection…</p>
      ) : destination && enrolled ? (
        <a href={destination} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Request STEMCoach access <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          STEMCoach is not yet enabled for this centre or enrolment. Ask your UniPathway adviser about availability.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        A separate STEMCoach account and institution approval are required. This
        does not grant a subscription or transfer student records.
      </p>
    </section>
  );
}
