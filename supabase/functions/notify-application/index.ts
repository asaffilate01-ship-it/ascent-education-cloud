import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from "../_shared/cors.ts";

// Public endpoint: called right after a consultancy application is submitted.
// Sends the applicant a confirmation email (when Resend is configured) and
// raises an in-app notification for the centre's admissions staff.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  if (!rateLimit(getClientIp(req), 5, 60_000)) return rateLimitResponse();

  try {
    const { name, email, destination, intake, tenantId } = await req.json().catch(() => ({}));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || typeof name !== "string" || name.length > 200) return json({ error: "Invalid name" }, 400);
    if (!email || !emailRegex.test(String(email))) return json({ error: "Invalid email" }, 400);

    const dest = String(destination ?? "").toLowerCase() === "germany" ? "Germany" : "the UK";
    const safeName = String(name).slice(0, 200).replace(/[<>]/g, "");
    const safeIntake = String(intake ?? "").slice(0, 60).replace(/[<>]/g, "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // In-app alert for admissions staff of that centre
    if (tenantId) {
      const { data: staff } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admissions_admin", "centre_director"]);

      const rows = (staff ?? []).map((s: { user_id: string }) => ({
        user_id: s.user_id,
        tenant_id: tenantId,
        title: "New application received",
        message: `${safeName} applied for ${dest}${safeIntake ? ` (${safeIntake} intake)` : ""}.`,
        type: "admissions",
        severity: "info",
      }));
      if (rows.length) await admin.from("notifications").insert(rows);
    }

    // Applicant confirmation email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return json({ ok: true, emailed: false, reason: "RESEND_API_KEY not configured" });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UniPathway <noreply@unipathway.pk>",
        to: [email],
        subject: `We've received your ${dest} application`,
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#111">
            <h1 style="font-size:20px;color:#8B1538;margin:0 0 12px">Thank you, ${safeName}</h1>
            <p style="font-size:14px;line-height:1.6">
              We have received your consultancy application for <strong>${dest}</strong>${safeIntake ? ` (${safeIntake} intake)` : ""}.
            </p>
            <p style="font-size:14px;line-height:1.6">
              A counsellor will contact you within one working day to confirm your eligibility,
              the documents we need, and your next steps.
            </p>
            <p style="font-size:12px;color:#666;line-height:1.6;margin-top:24px">
              UniPathway — a brand of LoungeTech Digitallösungen GmbH.<br/>
              Admission and visa decisions rest with the receiving institution and authorities.
            </p>
          </div>`,
      }),
    });

    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return json({ ok: true, emailed: false });
    }
    return json({ ok: true, emailed: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("notify-application error:", msg);
    return json({ error: msg }, 500);
  }
});
