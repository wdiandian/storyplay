import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { FeaturedRepository } from "@/lib/db/repositories/featuredRepo";
import type { FeaturedStory } from "@/lib/db/schema";
import { listFeaturedStorySkusByGender, storySkuToFeaturedRow } from "@/lib/storySku/manifest";
import { listPublishedStorySkusByGender } from "@/lib/storySku/publishedStore";

export const runtime = "nodejs";

type FeaturedRow = ReturnType<typeof storySkuToFeaturedRow>;

function dbStoryToFeaturedRow(story: FeaturedStory): FeaturedRow {
  return {
    id: story.id,
    gender: story.gender as "male" | "female",
    title: story.title,
    outline: story.outline,
    style: story.style,
    tags: story.tags,
    coverPath: story.coverPath,
    firstactPath: story.firstactPath,
    firstscenePath: story.firstscenePath,
    source: "preset",
    sourceProjectId: undefined,
    startRequest: undefined,
    openingPackage: undefined,
    fixedRuntimePackage: undefined,
    interactionPolicy: undefined,
    sortOrder: story.sortOrder,
    isActive: story.isActive,
    clickCount: story.clickCount,
  };
}

function mergeWithPresetFallback(
  creatorStories: FeaturedRow[],
  stories: FeaturedRow[],
  gender: "male" | "female",
) {
  const presetStories = listFeaturedStorySkusByGender(gender).map(storySkuToFeaturedRow);
  const seen = new Set<string>();
  const merged: FeaturedRow[] = [];

  for (const story of [...creatorStories, ...stories, ...presetStories]) {
    if (seen.has(story.id)) continue;
    seen.add(story.id);
    merged.push(story);
  }

  return merged.sort((a, b) => {
    if (a.source !== b.source) return a.source === "creator" ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

/**
 * GET /api/stories/featured?gender=male
 *
 * List active featured stories for homepage display.
 * Fallback: D1 query fails → return empty array (homepage shows no cards, gracefully degrades).
 *
 * Query Params:
 *   gender: "male" | "female" (required)
 *
 * Response: { stories: FeaturedStory[] }
 * Errors: 400 (invalid gender), 500 (should not reach user - caught and degraded)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const genderParam = searchParams.get("gender");

  // Validate gender
  if (!genderParam || !["male", "female"].includes(genderParam)) {
    return NextResponse.json(
      { error: "gender query parameter must be 'male' or 'female'" },
      { status: 400 },
    );
  }

  const gender = genderParam as "male" | "female";

  try {
    const creatorStories = (await listPublishedStorySkusByGender(gender)).map(storySkuToFeaturedRow);
    const db = getDb();
    const repo = new FeaturedRepository(db);

    const stories = (await repo.listByGender(gender)).map(dbStoryToFeaturedRow);

    return NextResponse.json({ stories: mergeWithPresetFallback(creatorStories, stories, gender) });
  } catch (err) {
    // D1 unavailable or query failed - degrade to preset Story SKU manifest.
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stories/featured] D1 query failed, returning SKU manifest fallback:", message);

    const creatorStories = (await listPublishedStorySkusByGender(gender)).map(storySkuToFeaturedRow);
    const stories = listFeaturedStorySkusByGender(gender).map(storySkuToFeaturedRow);
    return NextResponse.json({ stories: mergeWithPresetFallback(creatorStories, stories, gender) });
  }
}
