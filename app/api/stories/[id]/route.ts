import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/guard";
import {
  deleteStoredStoryForUser,
  getStoredStoryForUser,
} from "@/lib/storyStore";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const story = await getStoredStoryForUser(id, auth.userId);
  if (story === "forbidden") return jsonError("Forbidden story", 403);
  if (!story) return jsonError("Story not found", 404);

  return NextResponse.json(story);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const deleted = await deleteStoredStoryForUser(id, auth.userId);
  if (deleted === "forbidden") return jsonError("Forbidden story", 403);
  if (!deleted) return jsonError("Story not found", 404);

  return NextResponse.json({ ok: true });
}
