import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  if (!rateLimit(ip, 20, 60_000)) return rateLimitResponse();

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const JAAS_APP_ID = Deno.env.get("JAAS_APP_ID");
    const JAAS_API_KEY = Deno.env.get("JAAS_API_KEY");
    const JAAS_KEY_ID_RAW = Deno.env.get("JAAS_KEY_ID");

    if (!JAAS_APP_ID || !JAAS_API_KEY || !JAAS_KEY_ID_RAW) {
      throw new Error("JaaS credentials not configured");
    }

    const normalizedKeyId = JAAS_KEY_ID_RAW
      .trim()
      .split("/")
      .filter(Boolean)
      .pop();

    if (!normalizedKeyId) {
      throw new Error("Invalid JaaS key id configuration");
    }

    const { roomName, displayName, email, isModerator, avatarUrl, userId } = await req.json();

    if (!roomName || !displayName) {
      return new Response(JSON.stringify({ error: "roomName and displayName are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize the PEM key
    let pemKey = JAAS_API_KEY.trim();
    pemKey = pemKey.replace(/\\n/g, '\n');
    const base64Content = pemKey
      .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
      .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
      .replace(/\s+/g, '');
    const lines = base64Content.match(/.{1,64}/g) || [];
    pemKey = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;

    const privateKey = await jose.importPKCS8(pemKey, "RS256");

    const now = Math.floor(Date.now() / 1000);
    const nbf = now - 30;
    const roomForJwt = roomName.replace(/^vpaas-magic-cookie-[^/]+\//, '');

    const jwt = await new jose.SignJWT({
      aud: "jitsi",
      iss: "chat",
      sub: JAAS_APP_ID,
      room: roomForJwt,
      context: {
        user: {
          id: userId || auth.userId,
          name: String(displayName).slice(0, 100),
          email: email || auth.email,
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
        room: { regex: false },
      },
    })
      .setProtectedHeader({ alg: "RS256", kid: `${JAAS_APP_ID}/${normalizedKeyId}`, typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + 7200)
      .setNotBefore(nbf)
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
