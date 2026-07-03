import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/guard";
import { listStoredStoriesForUser } from "@/lib/storyStore";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.floor(limitParam), 100)
    : 50;

  const stories = await listStoredStoriesForUser(auth.userId, limit);
  return NextResponse.json({ stories });
}
