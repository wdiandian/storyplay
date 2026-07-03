import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/guard";
import { saveStoredStory } from "@/lib/storyStore";
import type {
  CharacterSaveInput,
  SceneSaveInput,
  StorySaveInput,
} from "@/lib/db/repositories/storyRepo";

export const runtime = "nodejs";

type SaveStoryPayload = {
  story?: StorySaveInput;
  scenes?: SceneSaveInput[];
  characters?: CharacterSaveInput[];
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isValidStoryInput(input: SaveStoryPayload["story"]): input is StorySaveInput {
  return (
    !!input &&
    typeof input.id === "string" &&
    input.id.trim().length > 0 &&
    typeof input.worldSetting === "string" &&
    input.worldSetting.trim().length > 0 &&
    typeof input.styleGuide === "string" &&
    input.styleGuide.trim().length > 0 &&
    (input.orientation === "portrait" || input.orientation === "landscape")
  );
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let payload: SaveStoryPayload;
  try {
    payload = (await req.json()) as SaveStoryPayload;
  } catch {
    return jsonError("Invalid JSON payload");
  }

  if (!isValidStoryInput(payload.story)) {
    return jsonError("Invalid story payload", 422);
  }

  const result = await saveStoredStory(
    {
      ...payload.story,
      userId: auth.userId,
    },
    Array.isArray(payload.scenes) ? payload.scenes : [],
    Array.isArray(payload.characters) ? payload.characters : [],
    auth.userId,
  );

  if (result === "forbidden") return jsonError("Forbidden story", 403);
  return NextResponse.json(result);
}
