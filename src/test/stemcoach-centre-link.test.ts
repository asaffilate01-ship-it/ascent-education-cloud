import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { stemcoachCentreJoinUrl } from "@/lib/stemcoachCentreLink";

const sql = readFileSync("supabase/migrations/20261017095500_stemcoach_centre_links.sql", "utf8");
const widget = readFileSync("src/components/student/STEMCoachLearningAccess.tsx", "utf8");
const dashboard = readFileSync("src/pages/student/StudentDashboard.tsx", "utf8");

describe("UniPathway verified STEMCoach centre link", () => {
  it("allows only exact trusted HTTPS destinations and valid institution slugs", () => {
    expect(stemcoachCentreJoinUrl("lahore-tuition"))
      .toBe("https://stemcoach.lovable.app/join-institution?code=lahore-tuition");
    expect(stemcoachCentreJoinUrl("lahore-tuition", "https://stemcoach.app"))
      .toBe("https://stemcoach.app/join-institution?code=lahore-tuition");
    expect(stemcoachCentreJoinUrl("lahore-tuition", "https://fake-stemcoach.app")).toBeNull();
    expect(stemcoachCentreJoinUrl("lahore-tuition", "http://stemcoach.app")).toBeNull();
    expect(stemcoachCentreJoinUrl("../wrong")).toBeNull();
    expect(stemcoachCentreJoinUrl("")).toBeNull();
  });

  it("requires operator verification and actual tenant-scoped enrolment", () => {
    expect(sql).toContain("REVOKE ALL ON TABLE public.stemcoach_centre_links FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("ALTER TABLE public.stemcoach_centre_links ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("enrolled.student_id = auth.uid()");
    expect(sql).toContain("enrolled.status = 'active'");
    expect(sql).toContain("profile.tenant_id = link.tenant_id");
    expect(sql).toContain("link.status = 'verified'");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.get_my_stemcoach_centre_link() FROM PUBLIC, anon");
  });

  it("mounts only on an authenticated learner portal and never sends academic records", () => {
    expect(dashboard).toContain("<STEMCoachLearningAccess enrolled={enrolmentsQuery.data.length > 0} />");
    expect(widget).toContain('get_my_stemcoach_centre_link');
    expect(widget).not.toContain("service_role");
    expect(widget).not.toContain("fetch(");
    expect(widget).toContain("separate STEMCoach account");
  });
});
