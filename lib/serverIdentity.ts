import "server-only";

const GUEST_ID_RE = /^[a-zA-Z0-9_-]{16,80}$/;

export function readGuestId(req: Request): string | null {
  const guestId = req.headers.get("x-storyplay-guest-id")?.trim();
  if (!guestId || !GUEST_ID_RE.test(guestId)) return null;
  return guestId;
}

export function resolveBillingUserId(authUserId: string, req: Request): string {
  if (authUserId !== "anonymous") return authUserId;
  const guestId = readGuestId(req);
  return guestId ? `guest:${guestId}` : "anonymous";
}
