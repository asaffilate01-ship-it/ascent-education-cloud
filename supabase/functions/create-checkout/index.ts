import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!rateLimit(getClientIp(req), 20, 60_000)) return rateLimitResponse();

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return json({ error: "Payments are not configured yet. Add STRIPE_SECRET_KEY to enable card payments." }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData.user;
    if (!user?.email) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { price_id, invoiceId, amount } = body as {
      price_id?: string;
      invoiceId?: string;
      amount?: number;
    };

    if (!price_id && !invoiceId) return json({ error: "price_id or invoiceId is required" }, 400);

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") ?? "";

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    // ---- Subscription checkout (SaaS plans) ----
    if (price_id) {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: price_id, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/director?checkout=success`,
        cancel_url: `${origin}/?checkout=cancelled`,
      });
      return json({ url: session.url });
    }

    // ---- One-off invoice payment ----
    // Read the invoice through the caller's own session so RLS decides visibility.
    const { data: invoice, error: invErr } = await supabaseClient
      .from("invoices")
      .select("id, tenant_id, amount, paid, type, student_id")
      .eq("id", invoiceId!)
      .maybeSingle();

    if (invErr || !invoice) return json({ error: "Invoice not found or not accessible" }, 404);

    const balance = Number(invoice.amount) - Number(invoice.paid ?? 0);
    const requested = Number(amount);
    const payable = Number.isFinite(requested) && requested > 0 ? Math.min(requested, balance) : balance;

    if (!(payable > 0)) return json({ error: "This invoice has no outstanding balance" }, 400);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "pkr",
          unit_amount: Math.round(payable * 100),
          product_data: { name: `UniPathway ${invoice.type ?? "tuition"} invoice` },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        metadata: {
          invoice_id: invoice.id,
          tenant_id: invoice.tenant_id ?? "",
          paid_by: user.id,
        },
      },
      metadata: { invoice_id: invoice.id, tenant_id: invoice.tenant_id ?? "" },
      success_url: `${origin}/student/finance?payment=success`,
      cancel_url: `${origin}/student/finance?payment=cancelled`,
    });

    return json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("create-checkout error:", msg);
    return json({ error: msg }, 500);
  }
});
