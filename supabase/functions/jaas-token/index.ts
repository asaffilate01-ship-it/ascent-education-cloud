import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JAAS_APP_ID = Deno.env.get("JAAS_APP_ID");
    const JAAS_API_KEY = Deno.env.get("JAAS_API_KEY");

    if (!JAAS_APP_ID || !JAAS_API_KEY) {
      throw new Error("JaaS credentials not configured");
    }

    const { roomName, displayName, email, isModerator, avatarUrl } = await req.json();

    if (!roomName || !displayName) {
      return new Response(JSON.stringify({ error: "roomName and displayName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Import the RSA private key
    const privateKey = await jose.importPKCS8(JAAS_API_KEY, "RS256");

    // Build the JWT payload per JaaS spec
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new jose.SignJWT({
      aud: "jitsi",
      iss: "chat",
      sub: JAAS_APP_ID,
      room: roomName,
      context: {
        user: {
          name: displayName,
          email: email || "",
          avatar: avatarUrl || "",
          moderator: isModerator ? "true" : "false",
        },
        features: {
          livestreaming: "true",
          recording: "true",
          transcription: "true",
          "outbound-call": "false",
          "sip-outbound-call": "false",
        },
      },
    })
      .setProtectedHeader({ alg: "RS256", kid: `${JAAS_APP_ID}/default` })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600) // 1 hour
      .setNotBefore(now)
      .sign(privateKey);

    return new Response(JSON.stringify({ token: jwt, appId: JAAS_APP_ID }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("JaaS token error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
