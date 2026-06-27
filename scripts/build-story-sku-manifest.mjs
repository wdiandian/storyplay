#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const HOME_DIR = join(ROOT, "public", "home");
const FIRSTACT_DIR = join(HOME_DIR, "firstact");
const OUT_FILE = join(HOME_DIR, "manifest.json");

const LOCALES = [
  ["zh", "firstact", "zh"],
  ["en", "firstact-en", "en"],
  ["ja", "firstact-ja", "ja"],
  ["portraitZh", "firstact-portrait", "portraitZh"],
  ["portraitEn", "firstact-portrait-en", "portraitEn"],
  ["portraitJa", "firstact-portrait-ja", "portraitJa"],
];

function publicPath(...parts) {
  return `/home/${parts.join("/")}`.replace(/\\/g, "/");
}

function filePublicPath(dirName, fileName) {
  return publicPath(dirName, fileName);
}

function fileExists(...parts) {
  return existsSync(join(HOME_DIR, ...parts));
}

function listMatchingPublicFiles(dirName, id) {
  const dir = join(HOME_DIR, dirName);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.startsWith(`${id}_`) && statSync(join(dir, file)).isFile())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => filePublicPath(dirName, file));
}

function splitTags(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/[\/,，、|]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function countChoices(beats) {
  return beats.reduce((sum, beat) => {
    if (beat?.next?.type !== "choice") return sum;
    return sum + (Array.isArray(beat.next.choices) ? beat.next.choices.length : 0);
  }, 0);
}

function firstActPaths(id) {
  const paths = {};
  for (const [key, dirName] of LOCALES) {
    const fileName = `${id}.json`;
    if (fileExists(dirName, fileName)) {
      paths[key] = filePublicPath(dirName, fileName);
    }
  }
  return paths;
}

function buildSku(fileName, sortOrder) {
  const id = fileName.replace(/\.json$/i, "");
  const raw = readFileSync(join(FIRSTACT_DIR, fileName), "utf8");
  const data = JSON.parse(raw);
  const gender = id.startsWith("f") ? "female" : "male";
  const audienceLabel = gender === "female" ? "女性向" : "男性向";
  const storyState = data.storyState ?? {};
  const beats = Array.isArray(data.scene?.beats) ? data.scene.beats : [];
  const cover = fileExists(`${id}.webp`) ? publicPath(`${id}.webp`) : null;
  const firstScene = fileExists("firstscene", `${id}.webp`)
    ? filePublicPath("firstscene", `${id}.webp`)
    : undefined;
  const firstScenePortrait = fileExists("firstscene-portrait", `${id}.webp`)
    ? filePublicPath("firstscene-portrait", `${id}.webp`)
    : undefined;

  return {
    id,
    gender,
    audienceLabel,
    title: data.cardTitle ?? id,
    logline: storyState.logline ?? "",
    synopsis: storyState.synopsis ?? "",
    tags: splitTags(storyState.genreTags),
    genreTagsRaw: storyState.genreTags ?? "",
    stylePrompt: data.styleGuide ?? "",
    assets: {
      cover,
      firstScene,
      firstScenePortrait,
      portraits: listMatchingPublicFiles("firstportrait", id),
      portraitsPortrait: listMatchingPublicFiles("firstportrait-portrait", id),
    },
    firstAct: firstActPaths(id),
    runtimeSummary: {
      sceneKey: data.scene?.sceneKey,
      beatsCount: beats.length,
      choicesCount: countChoices(beats),
      charactersCount: Array.isArray(data.characters) ? data.characters.length : 0,
    },
    storyState: {
      protagonist: storyState.protagonist,
      castNotes: storyState.castNotes,
      openThreads: Array.isArray(storyState.openThreads) ? storyState.openThreads : [],
      relationships: Array.isArray(storyState.relationships) ? storyState.relationships : [],
      nextHook: storyState.nextHook,
    },
    publish: {
      status: "active",
      source: "preset",
    },
    curation: {
      sortOrder,
      featured: true,
    },
  };
}

function countFiles(dirName) {
  const dir = join(HOME_DIR, dirName);
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((file) => statSync(join(dir, file)).isFile()).length;
}

function main() {
  if (!existsSync(FIRSTACT_DIR)) {
    throw new Error(`Missing ${relative(ROOT, FIRSTACT_DIR)}`);
  }

  const files = readdirSync(FIRSTACT_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const genderSortOrder = { female: 0, male: 0 };
  const stories = files.map((file) => {
    const gender = file.startsWith("f") ? "female" : "male";
    const sortOrder = genderSortOrder[gender]++;
    return buildSku(file, sortOrder);
  });
  const missingCover = stories.filter((story) => !story.assets.cover).map((story) => story.id);
  const missingFirstScene = stories.filter((story) => !story.assets.firstScene).map((story) => story.id);
  const missingLocale = {};

  for (const [, , manifestKey] of LOCALES) {
    const missing = stories
      .filter((story) => !story.firstAct[manifestKey])
      .map((story) => story.id);
    if (missing.length > 0) missingLocale[manifestKey] = missing;
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      firstActDir: "/home/firstact",
      note: "Generated from prebaked first-act runtime packages. Do not put full runtime payloads into SKU cards.",
    },
    counts: {
      stories: stories.length,
      male: stories.filter((story) => story.gender === "male").length,
      female: stories.filter((story) => story.gender === "female").length,
      firstAct: countFiles("firstact"),
      firstActEn: countFiles("firstact-en"),
      firstActJa: countFiles("firstact-ja"),
      firstActPortrait: countFiles("firstact-portrait"),
      firstScene: countFiles("firstscene"),
      firstScenePortrait: countFiles("firstscene-portrait"),
      portraits: countFiles("firstportrait"),
      portraitsPortrait: countFiles("firstportrait-portrait"),
    },
    audit: {
      missingCover,
      missingFirstScene,
      missingLocale,
    },
    stories,
  };

  writeFileSync(OUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[story-sku] wrote ${relative(ROOT, OUT_FILE)} with ${stories.length} stories`);
  if (missingCover.length || missingFirstScene.length || Object.keys(missingLocale).length) {
    console.warn("[story-sku] audit warnings:", JSON.stringify(manifest.audit, null, 2));
  }
}

main();
