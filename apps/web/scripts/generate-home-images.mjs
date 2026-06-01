#!/usr/bin/env node
/**
 * One-off generator: produces 23 AI cards (7 hero + 16 gallery) for the
 * InfiPlot homepage via Runware FLUX.2 and writes them as PNGs under
 * apps/web/public/home/.
 *
 * Reads IMAGE_BASE_URL / IMAGE_API_KEY / IMAGE_MODEL from apps/web/.env.local.
 *
 * Run once:
 *   node apps/web/scripts/generate-home-images.mjs
 *
 * Idempotent: skips any PNG that already exists. Pass --force to regenerate.
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");
const ENV_FILE = resolve(WEB_ROOT, ".env.local");
const OUT_DIR = resolve(WEB_ROOT, "public", "home");

const FORCE = process.argv.includes("--force");

/* ---------- env loading (tiny .env parser) ---------- */
function loadEnv(path) {
  const txt = readFileSync(path, "utf8");
  const env = {};
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const env = loadEnv(ENV_FILE);
const BASE_URL = env.IMAGE_BASE_URL;
const API_KEY = env.IMAGE_API_KEY;
const MODEL = env.IMAGE_MODEL;
if (!BASE_URL || !API_KEY || !MODEL) {
  console.error("Missing IMAGE_BASE_URL / IMAGE_API_KEY / IMAGE_MODEL in", ENV_FILE);
  process.exit(2);
}
if (!BASE_URL.includes("runware.ai")) {
  console.error("This script assumes Runware. Got:", BASE_URL);
  process.exit(2);
}

/* ---------- prompts ---------- */

const BASE_QUALITY =
  "masterpiece, best quality, highly detailed, cinematic lighting, soft warm color grading, intricate background, no text, no watermark";

// 7 hero cards — varied flagship moods that showcase the platform's range
const HERO = [
  {
    name: "hero0",
    prompt:
      "anime visual novel cover art, two high school students standing under cherry blossom petals at dusk, warm golden sunset light, soft watercolor texture, japanese galgame illustration, widescreen composition",
    w: 1024,
    h: 640,
  },
  {
    name: "hero1",
    prompt:
      "post-apocalyptic wasteland anime, lone scavenger silhouette against rusted mecha mountain, golden dust storm sweeping across the dunes, cinematic widescreen, anime concept art, dramatic backlight",
    w: 1024,
    h: 640,
  },
  {
    name: "hero2",
    prompt:
      "anime xianxia cultivator boy in flowing white robes standing on a floating mountain peak above a sea of clouds, vermillion banners fluttering, vertical poster composition, chinese mythology, galgame illustration",
    w: 768,
    h: 1024,
  },
  {
    name: "hero3",
    prompt:
      "anime visual novel scene, southern chinese small town in june rain, a transfer student looking back from a rainy classroom window, ceiling fan in background, soft warm afternoon tones, slice of life galgame illustration",
    w: 1024,
    h: 832,
  },
  {
    name: "hero4",
    prompt:
      "cyberpunk anime portrait, amnesiac detective standing in neon-soaked rainy alley of an east-asian metropolis in 2087, holographic signs reflecting on wet pavement, vertical composition, blade runner palette, anime illustration",
    w: 768,
    h: 1024,
  },
  {
    name: "hero5",
    prompt:
      "anime mystery scene, late-night high school library underground chamber, flickering candlelight, a class president kneeling before a glowing rune circle on the stone floor, gothic galgame style, mysterious teal-green glow",
    w: 1024,
    h: 640,
  },
  {
    name: "hero6",
    prompt:
      "anime isekai cathedral scene, silver-haired holy maiden with tearful eyes kneeling before a glowing magic summoning circle, golden cathedral light streaming through stained glass, summoned hero just appearing in modern school uniform, warm galgame illustration",
    w: 1024,
    h: 640,
  },
];

// 7 female-oriented hero cards — same slot aspect ratios as HERO above,
// otome / josei / xianxia / cyberpunk romance angles
const HERO_F = [
  {
    name: "hero0_f",
    prompt:
      "anime josei otome game illustration, beautiful female protagonist in ornate eastern hanfu silk robes, behind her a tall stoic regent prince in dark embroidered robes leaning down to clasp a red jade bracelet on her wrist, ancient chinese palace interior, soft candlelight, romantic widescreen composition",
    w: 1024,
    h: 640,
  },
  {
    name: "hero1_f",
    prompt:
      "anime modern romance scene, young woman in pajamas sitting on a bed at dawn, golden light through curtains, looking at her phone in shock as if she has just been pulled back in time, soft warm tones, melancholic otome illustration, widescreen",
    w: 1024,
    h: 640,
  },
  {
    name: "hero2_f",
    prompt:
      "anime villainess otome game character, beautiful young noblewoman with elaborate golden ringlet hair and crimson ballgown, standing alone in a baroque royal academy ballroom while other noble girls glare from the background, dramatic chandelier light, vertical poster composition, otome game cover art",
    w: 768,
    h: 1024,
  },
  {
    name: "hero3_f",
    prompt:
      "anime visual novel scene, female high school transfer student standing on a rainy southern chinese town rooftop, sharing her umbrella with a moody boy reading poetry on the railing, soft warm afternoon palette, slice of life otome illustration",
    w: 1024,
    h: 832,
  },
  {
    name: "hero4_f",
    prompt:
      "anime josei coronation scene, beautiful young empress in ornate ceremonial robes seated on a high eastern throne, head turned to glance at a handsome attendant standing in the shadowed pillars below, vertical composition, opulent silks and gold, otome game illustration",
    w: 768,
    h: 1024,
  },
  {
    name: "hero5_f",
    prompt:
      "anime wuxia swordswoman in flowing light hanfu, jade hairpin, white sword raised mid-stance, cherry blossoms swirling around her, mountain pavilion in the background at golden hour, dynamic widescreen otome wuxia illustration",
    w: 1024,
    h: 640,
  },
  {
    name: "hero6_f",
    prompt:
      "anime visual novel scene, female high school student standing on a sunset rooftop looking up at a tall handsome senior in school uniform, warm orange sky, golden hour, romantic galgame otome cover art, widescreen",
    w: 1024,
    h: 640,
  },
];

// 16 gallery cards — broader sweep of genres / moods showcased by the platform
const GALLERY = [
  {
    name: "gallery0",
    prompt:
      "anime girl in summer yukata watching fireworks at a japanese festival night, warm bokeh lanterns, vertical composition, soft watercolor, slice of life galgame",
    w: 768,
    h: 1024,
  },
  {
    name: "gallery1",
    prompt:
      "cyberpunk neon city skyline at rainy night, flying vehicles, holographic billboards in chinese characters, anime widescreen, cinematic",
    w: 1024,
    h: 640,
  },
  {
    name: "gallery2",
    prompt:
      "anime two students standing on empty rural train platform after school, golden hour, slice of life galgame illustration, cinematic widescreen, warm tones",
    w: 1024,
    h: 832,
  },
  {
    name: "gallery3",
    prompt:
      "anime mage girl in star-embroidered robes casting starlight spell, ancient fantasy library, vertical composition, magical particles, painterly illustration",
    w: 768,
    h: 1024,
  },
  {
    name: "gallery4",
    prompt:
      "anime mecha pilot girl strapped in cockpit, holographic interfaces around her, dramatic red emergency lighting, intense expression, mecha anime style",
    w: 1024,
    h: 640,
  },
  {
    name: "gallery5",
    prompt:
      "anime detective girl in long trench coat under a flickering streetlamp at midnight, noir mood, vertical composition, rain mist, cinematic anime",
    w: 768,
    h: 1024,
  },
  {
    name: "gallery6",
    prompt:
      "anime cyberpunk couple sharing a quiet moment in a neon-lit rainy alley, holographic umbrella, electric blue and pink reflections, romantic galgame illustration",
    w: 1024,
    h: 832,
  },
  {
    name: "gallery7",
    prompt:
      "anime sword duel between two xianxia cultivators in a bamboo grove, motion blur on swords, falling bamboo leaves, dynamic action composition",
    w: 1024,
    h: 640,
  },
  {
    name: "gallery8",
    prompt:
      "anime princess in ornate eastern gown seated on an ancient carved throne, candlelight, intricate background tapestries, vertical poster composition, fantasy galgame",
    w: 768,
    h: 1024,
  },
  {
    name: "gallery9",
    prompt:
      "anime classroom afternoon, sun streaming through windows onto empty desks, a single uniformed student writing in a notebook, slice of life watercolor, nostalgic",
    w: 1024,
    h: 640,
  },
  {
    name: "gallery10",
    prompt:
      "anime girl reading a folded letter under a cherry blossom tree, melancholic expression, petals drifting, soft warm watercolor, slice of life galgame",
    w: 1024,
    h: 832,
  },
  {
    name: "gallery11",
    prompt:
      "anime moon goddess descending from a starlit sky, silver hair flowing, ethereal aurora glow, dreamy painterly illustration, vertical composition",
    w: 768,
    h: 1024,
  },
  {
    name: "gallery12",
    prompt:
      "anime samurai standing alone under a blood red full moon, sakura petals carried on the wind, katana drawn, dramatic backlight, cinematic widescreen",
    w: 1024,
    h: 640,
  },
  {
    name: "gallery13",
    prompt:
      "anime witch girl brewing a glowing potion in a candlelit forest hut, hanging dried herbs, magical sparks rising from the cauldron, vertical composition",
    w: 768,
    h: 1024,
  },
  {
    name: "gallery14",
    prompt:
      "anime beach summer scene, two girlfriends sitting on the sand watching a pink-orange sunset, gentle waves, slice of life galgame illustration",
    w: 1024,
    h: 640,
  },
  {
    name: "gallery15",
    prompt:
      "anime hacker girl in a dim apartment surrounded by glowing screens, neon cyan reflections on her face, intense focus, cyberpunk galgame style",
    w: 1024,
    h: 832,
  },
];

const ALL = [...HERO, ...HERO_F, ...GALLERY];

/* ---------- Runware caller ---------- */

async function generate({ prompt, w, h }) {
  const body = [
    {
      taskType: "imageInference",
      taskUUID: crypto.randomUUID(),
      model: MODEL,
      positivePrompt: `${prompt}, ${BASE_QUALITY}`,
      width: w,
      height: h,
      steps: 4,
      CFGScale: 3.5,
      numberResults: 1,
      outputType: "base64Data",
      outputFormat: "PNG",
    },
  ];
  const res = await fetch(BASE_URL.replace(/\/$/, ""), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (json.errors?.length) {
    const e = json.errors[0];
    throw new Error(`Runware [${e.code ?? "?"}]: ${e.message ?? "no msg"}`);
  }
  const b64 = json.data?.[0]?.imageBase64Data;
  if (!b64) throw new Error(`No image data: ${text.slice(0, 200)}`);
  return Buffer.from(b64, "base64");
}

/* ---------- main loop ---------- */

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const total = ALL.length;
let done = 0;
let skipped = 0;
let failed = 0;
const t0 = Date.now();

console.log(`[gen] ${total} cards → ${OUT_DIR}`);

for (const card of ALL) {
  const out = resolve(OUT_DIR, `${card.name}.png`);
  const webpOut = resolve(OUT_DIR, `${card.name}.webp`);
  if (!FORCE && (existsSync(out) || existsSync(webpOut))) {
    const path = existsSync(out) ? out : webpOut;
    const size = statSync(path).size;
    if (size > 1024) {
      skipped++;
      done++;
      console.log(`[${done}/${total}] skip ${card.name} (${size} B)`);
      continue;
    }
  }
  const label = `[${++done}/${total}] ${card.name}`;
  process.stdout.write(`${label} … `);
  const t = Date.now();
  try {
    const buf = await generate(card);
    writeFileSync(out, buf);
    process.stdout.write(`ok ${buf.length} B in ${Math.round((Date.now() - t) / 100) / 10}s\n`);
  } catch (e) {
    failed++;
    process.stdout.write(`FAIL: ${e.message}\n`);
  }
}

console.log(
  `\n[gen] done in ${Math.round((Date.now() - t0) / 1000)}s — generated ${
    done - skipped - failed
  } / skipped ${skipped} / failed ${failed}`,
);
process.exit(failed ? 1 : 0);
