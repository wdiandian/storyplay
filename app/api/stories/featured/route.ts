import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { FeaturedRepository } from "@/lib/db/repositories/featuredRepo";
import { listFeaturedStorySkusByGender, storySkuToFeaturedRow } from "@/lib/storySku/manifest";
import { listPublishedStorySkusByGender } from "@/lib/storySku/publishedStore";

export const runtime = "nodejs";

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

    const stories = await repo.listByGender(gender);

    return NextResponse.json({ stories: [...creatorStories, ...stories] });
  } catch (err) {
    // D1 unavailable or query failed - degrade to preset Story SKU manifest.
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stories/featured] D1 query failed, returning SKU manifest fallback:", message);

    const creatorStories = (await listPublishedStorySkusByGender(gender)).map(storySkuToFeaturedRow);
    const stories = listFeaturedStorySkusByGender(gender).map(storySkuToFeaturedRow);
    return NextResponse.json({ stories: [...creatorStories, ...stories] });
  }
}
