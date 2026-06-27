"use client";

const STORAGE_KEY = "storyplay:guestId";
const GUEST_ID_RE = /^[a-zA-Z0-9_-]{16,80}$/;

function makeGuestId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 32);
}

export function readStoredGuestId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && GUEST_ID_RE.test(existing)) return existing;
    const next = makeGuestId();
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return "";
  }
}

export function guestHeaders(): Record<string, string> {
  const guestId = readStoredGuestId();
  return guestId ? { "x-storyplay-guest-id": guestId } : {};
}
