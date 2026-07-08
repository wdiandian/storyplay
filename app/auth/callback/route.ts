import { type NextRequest, NextResponse } from "next/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Only allow same-origin relative paths. Rejects `//evil.com`, `/\evil.com`,
// and absolute URLs that would otherwise turn `${origin}${next}` into an
// open redirect (CWE-601).
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  // Reject control chars (CR/LF etc.) — defense-in-depth against header
  // injection if `next` ever reaches a context that doesn't re-encode it.
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return "/";
  }
  return raw;
}

function publicOrigin(request: NextRequest): string {
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("127.0.0.1")) {
    return `${request.nextUrl.protocol}//${host}`;
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = publicOrigin(request);

  // Auth not configured: nothing can legitimately hit this route, so just
  // bounce home instead of constructing a Supabase client from blank env vars.
  if (!AUTH_ENABLED) {
    return NextResponse.redirect(`${origin}/`);
  }

  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  try {
    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.warn("[auth-callback] exchange failed:", error.message);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth-callback] unexpected error:", message);
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
