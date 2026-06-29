import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "public", "home", "manifest.json");
const OUT_DIR = path.join(ROOT, "public", "home");
const BACKUP_DIR = path.join(ROOT, "tmp", "haiyi-cover-backup");
const PROMPT_LOG_PATH = path.join(BACKUP_DIR, "haiyi-cover-prompts.json");
const TOKEN_CANDIDATES = [
  path.join(os.homedir(), ".claude", "commands", "token.md"),
  path.join(os.homedir(), ".cursor", "commands", "token.md"),
];

const API = "https://www.haiyi.art";
const SS = 52;
const WIDTH = 960;
const HEIGHT = 1200;

const args = new Set(process.argv.slice(2));
const idArg = process.argv.find((arg) => arg.startsWith("--ids="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const dryRun = args.has("--dry-run");
const all = args.has("--all");
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Math.max(1, Number(concurrencyArg?.split("=")[1] ?? 2));
const safePromptIds = new Set(
  (process.argv.find((arg) => arg.startsWith("--safe-prompt-ids="))?.split("=")[1] ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

function readToken() {
  for (const candidate of TOKEN_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      const token = fs.readFileSync(candidate, "utf8").trim();
      if (token) return token;
    }
  }
  throw new Error("No Haiyi token found. Run haiyi login first.");
}

function headers(token) {
  return {
    "Content-Type": "application/json",
    token,
    "x-app-id": "web_global_seaart",
    "x-platform": "web",
    "x-page-id": randomUUID(),
    "x-request-id": randomUUID(),
    "x-timezone": "Asia/Shanghai",
  };
}

async function postJson(token, endpoint, payload) {
  const response = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: headers(token),
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`${endpoint} returned HTTP ${response.status}`);
  }
  const json = await response.json();
  if (json?.status?.code !== 10000) {
    throw new Error(`${endpoint} failed: ${json?.status?.msg ?? "unknown error"}`);
  }
  return json.data;
}

function pickTextRule(data) {
  const rule = data.play_rules.find((item) => {
    const supportsText = item.type_supported?.includes("text");
    const needsImage = item.input_options?.some((opt) => opt.key?.startsWith("image_list"));
    return supportsText && !needsImage;
  });
  if (!rule) throw new Error("No text-to-image play rule found.");
  return rule;
}

function defaultOption(options) {
  return options?.find((option) => option.default)?.value ?? options?.[0]?.value;
}

function buildMeta(rule, prompt) {
  const meta = {};
  for (const field of [
    ...(rule.input_options ?? []),
    ...(rule.dimension_config?.fields ?? []),
    ...(rule.custom_params ?? []),
  ]) {
    if (!field.key) continue;
    if (field.key === "prompt") {
      meta[field.key] = prompt;
    } else if (field.key === "n_iter") {
      meta[field.key] = 1;
    } else if (field.key === "resolution") {
      meta[field.key] = "1K";
    } else if (field.key === "aspect_ratio") {
      meta[field.key] = "4:5";
    } else if (field.key === "thinking_level") {
      meta[field.key] = "低";
    } else if (field.options) {
      meta[field.key] = defaultOption(field.options);
    } else if (field.type === "number") {
      meta[field.key] = 0;
    } else if (field.type === "array") {
      meta[field.key] = [];
    } else {
      meta[field.key] = "";
    }
  }
  return meta;
}

function compact(value, max = 360) {
  if (!value) return "";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

const COVER_BRIEF = {
  f0: {
    hook: "sealed bride awakening inside a carved black stone sarcophagus, bound by a life-and-death pact with an undead prince",
    subject: "bride in white veil inside the sarcophagus, pale crowned prince reflected in obsidian stone, joined hands as the focal symbol",
    palette: "bone white, funeral black, old gold, cold blue candlelight",
    composition: "low-angle intimate coffin interior, triangular candle arrangement, hands and crown readable at thumbnail size",
  },
  f1: {
    hook: "discarded artisan awakens an ink dragon from an ancestral hall",
    subject: "young ink artisan kneeling beside cracked jade, monochrome dragon coils out of spilled ink and broken mechanisms",
    palette: "ivory paper, carbon black, mineral blue, moss green",
    composition: "large empty paper field with dragon brushstroke arc, human figure small but clear, asymmetrical Chinese album-page layout",
  },
  f2: {
    hook: "a woman from a fading ukiyo-e painting and a modern gallery demolition mystery",
    subject: "elegant courtesan half stepping out of a torn woodblock print while a demolition shadow approaches outside the gallery",
    palette: "vermilion, indigo, aged cream, faded sakura pink",
    composition: "flat woodblock poster with torn-paper boundary, diagonal umbrella and Mount Fuji silhouette, no modern signage",
  },
  f3: {
    hook: "Dunhuang mural bride bound to the nine-colored deer and a forbidden wall-door",
    subject: "celestial bride painted into a cave mural, nine-colored deer above a sealed dark gate, mineral pigment cracks visible",
    palette: "oxidized teal, cinnabar, ochre, lapis, aged plaster",
    composition: "fresco wall as the whole frame, central sacred deer medallion, bride and hidden door as secondary focal points",
  },
  f4: {
    hook: "Persian princess trapped in a garden chess bargain",
    subject: "princess, scholar, oversized chess pieces, cypress trees, locked garden gate",
    palette: "lapis blue, turquoise tile, saffron, rose, parchment gold",
    composition: "strict Persian miniature perspective, ornamental border feeling without actual border text, chessboard leading lines",
  },
  f5: {
    hook: "museum icon of a saintly empress comes alive at dusk",
    subject: "Byzantine empress mosaic with one living eye and a modern curator silhouette in the museum darkness",
    palette: "gold tesserae, midnight blue, ruby red, smoky gray",
    composition: "front-facing sacred icon poster, tiny museum silhouette at lower edge, mosaic tiles remain graphic and flat",
  },
  f6: {
    hook: "female knight under a stained-glass thorn crown at a midnight cathedral altar",
    subject: "armored heroine holding a fractured sword beneath a thorn crown window, red rose light falling across the floor",
    palette: "ruby, sapphire, violet, lead black, white highlights",
    composition: "stained-glass panel geometry, strong vertical sword, rose-window halo, no readable church text",
  },
  f7: {
    hook: "wind valley oath in a dying forest",
    subject: "wind-blown heroine, seed pouch, giant withered tree spirit, paper glider scraps caught in green wind",
    palette: "sage green, sunlit straw, soft sky blue, warm earth",
    composition: "hand-painted storybook landscape, protagonist in lower third, sweeping wind spiral connects tree and sky",
  },
  f8: {
    hook: "quiet high-school morning with an unfinished summer confession",
    subject: "girl by a tall bedroom window, unsent letter, cicada shell, sunlight strip on tatami",
    palette: "soft cream, summer blue, pale green, warm wood",
    composition: "KyoAni-style intimate room scene, close emotional portrait, clean negative space, no written letter text",
  },
  f9: {
    hook: "rainy bookstore and star-trail destiny",
    subject: "girl under bookstore awning looking up as star trails reflect in puddles and glass shelves",
    palette: "deep indigo, wet asphalt, comet pink, warm bookstore amber",
    composition: "wide vertical street depth, tiny human against luminous sky reflection, cinematic rain bokeh",
  },
  f10: {
    hook: "scientist and android romance in a midnight lab",
    subject: "female scientist touching a male android's transparent cheek, floating synthetic heart between them",
    palette: "cyan, magenta, black chrome, sterile white",
    composition: "close two-person profile, lab glass and cables as abstract shapes, no screens or UI",
  },
  f11: {
    hook: "romantic save-point at a pastel beach dusk",
    subject: "girl holding a glowing seashell save crystal on a pink beach, clock-like ripples in the tide",
    palette: "rose pink, lavender, peach sunset, pearl white",
    composition: "galgame CG key visual, gentle face close-up, glowing shell centered, no interface elements",
  },
  f12: {
    hook: "starship mechanic caught in a bridge alert",
    subject: "young mechanic with tool belt bracing beside a cracked starship window, tiny planet and warning light colors outside",
    palette: "teal steel, orange alert light, starfield black, white suit accents",
    composition: "3D animated film still, dynamic diagonal bridge architecture, no readable panels or UI",
  },
  f13: {
    hook: "retro future summer dream and lost memory",
    subject: "stylish woman with sunglasses, cassette tape, neon sun, grid ocean, translucent old apartment silhouette",
    palette: "purple, hot pink, electric cyan, sunset orange",
    composition: "vaporwave poster with large graphic shapes, portrait off-center, plenty of surreal negative space",
  },
  f14: {
    hook: "minimal line poet whose drawings become reality",
    subject: "single-line heroine silhouette pulling a red thread that turns into a bird and a city skyline",
    palette: "warm white, charcoal black, one red accent",
    composition: "minimal vector poster, very sparse, strong clean silhouette and continuous line motif",
  },
  f15: {
    hook: "low-poly prism princess in a crystal throne room",
    subject: "geometric princess holding a fractured prism heart, crystal throne shards and angular light",
    palette: "amethyst, emerald, ice blue, white facets",
    composition: "low-poly faceted portrait, symmetrical throne geometry, strong jewel-like planes",
  },
  f16: {
    hook: "woman with a hidden second life revealed in a mirror",
    subject: "female profile merged with bedroom mirror, second silhouette behind glass, city rain and pine branches inside the face",
    palette: "monochrome base, muted blue, small warm lamp glow",
    composition: "double exposure profile, mirror oval as main shape, elegant psychological thriller tone",
  },
  f17: {
    hook: "retro pop-art pastry-shop heroine",
    subject: "confident retro woman with pastry box and lightning-shaped color burst, no speech bubbles",
    palette: "primary red, yellow, cyan, black, cream",
    composition: "bold pop-art bust portrait, halftone dots, graphic food shapes, poster-like clarity",
  },
  f18: {
    hook: "system debugger trapped in a glitch void",
    subject: "female hacker face breaking into glass-like cyan shards and pure geometric light fractures",
    palette: "black, cyan, magenta, acid green accents",
    composition: "glitch portrait, fragmented face, abstract scanlines and broken glass only, no screens, no code, no symbols",
  },
  f19: {
    hook: "romance between rival designers in a meeting room",
    subject: "two elegant silhouettes across a red drafting table, geometric tension and crossed ruler-like bars",
    palette: "Swiss red, black, white, small beige paper tone",
    composition: "pure graphic poster, flat shapes, no typography, no symbols, strong negative space",
  },
  f20: {
    hook: "paper crane messenger in a stormy attic",
    subject: "girl opening a letter as hundreds of paper cranes fly through moonlit attic rafters",
    palette: "paper white, storm blue, warm candle orange, shadow brown",
    composition: "multilayer papercut depth, cranes as swirling path, lace-like silhouettes",
  },
  f21: {
    hook: "solar greenhouse botanist and bioluminescent plants",
    subject: "botanist among glasshouse vines, solar tower beyond roof, glowing flower in her hand",
    palette: "leaf green, sun gold, glass teal, coral flower light",
    composition: "optimistic solarpunk greenhouse, bright airy depth, plant silhouettes frame the protagonist",
  },
  f22: {
    hook: "deep-sea kiss and cosmic horror in a red-lit station lab",
    subject: "female explorer facing a giant porthole with an eldritch silhouette in black water, red lab light",
    palette: "abyss teal, emergency red, black, cold white",
    composition: "small human before vast porthole, tentacle-like shadows as abstract shapes, no gore",
  },
  f23: {
    hook: "rose in a dark alley after a club performance",
    subject: "woman in dark red trench coat holding a thorny rose, rain-slick alley, stage light leaking from a back door",
    palette: "deep red, wet black, cyan rim light, muted violet",
    composition: "urban noir portrait, alley vanishing point, no signs or readable neon",
  },
  f24: {
    hook: "shepherdess secret as a cozy mystery",
    subject: "female sleuth near cottage window, sheep-shaped shadow outside in storm, magnifying glass and old key",
    palette: "amber candlelight, snow blue, moss green, cream paper",
    composition: "cozy mystery cover, warm interior vs cold exterior contrast, no book-title text",
  },
  f25: {
    hook: "ghost in a rose manor garden",
    subject: "woman and translucent ghost in overgrown rose garden, ruined manor and thorn gate",
    palette: "moonlit blue, faded rose, velvet black, pale silver",
    composition: "gothic romance tableau, roses frame the lower edge, ghostly figure separated by thorn arch",
  },
  f26: {
    hook: "dark fairytale candy house and wolf-grandmother twist",
    subject: "red-cloaked heroine before a candy cottage with wolf shadow in window, silver blade hidden in basket",
    palette: "cranberry red, forest green, candy cream, shadow black",
    composition: "storybook horror, cottage large in background, heroine clear in foreground, no gore",
  },
  f27: {
    hook: "wasteland bride and a radioactive oasis bargain",
    subject: "battle-worn woman in desert armor holding a glowing water vial beside steel fortress bed curtains",
    palette: "dust orange, radioactive green, rust metal, pale linen",
    composition: "post-apocalyptic fashion portrait, fortress geometry, vial as central glow, no text labels",
  },
  f28: {
    hook: "urban monster compendium on a subway platform",
    subject: "modern sorceress opening a translucent bestiary, hidden subway creatures reflected in train windows",
    palette: "rainy cyan, sodium yellow, charcoal, magical violet",
    composition: "urban fantasy platform perspective, spiral ward as graphic focal, no station signs",
  },
  f29: {
    hook: "bookstore alchemy where cut-out words become objects",
    subject: "female silhouette, candle flame, scissors, floating paper shapes turning into gold object",
    palette: "emerald, antique gold, deep navy, parchment",
    composition: "abstract geometric book-cover design, clean line art, no letters, no glyphs, no readable writing",
  },
  m0: {
    hook: "fallen sage displayed at a dark auction after betrayal",
    subject: "wounded grand mage with broken mana core glow, chain silhouette, auction lamps behind him",
    palette: "deep green, tarnished gold, black, blood-warm crimson accent",
    composition: "dark fantasy oil portrait, strong chiaroscuro, cracked magical core as focal symbol",
  },
  m1: {
    hook: "scholar whose brush brings painted spirits to life",
    subject: "young scholar in ruined temple holding glowing brush, ink woman and dragon emerging from scroll mist",
    palette: "ink black, rice paper white, jade green, moon gray",
    composition: "minimal ink wash with large negative space, brushstroke dragon arc, no calligraphy text",
  },
  m2: {
    hook: "oiran assassin in a night parlor",
    subject: "handsome disguised performer with hidden blade, lantern-lit tatami, painted screen shadows",
    palette: "ukiyo-e red, indigo, warm lantern gold, cream",
    composition: "woodblock style, flat perspective, blade and fan crossing diagonally, no Japanese characters",
  },
  m3: {
    hook: "archaeologist follows a flying apsara mural inside a dark cave",
    subject: "young archaeologist reaching toward luminous Dunhuang dancer mural, cave dust and pigment flakes",
    palette: "ochre, teal, cinnabar, cave black, halo gold",
    composition: "fresco texture dominates, human silhouette small under giant apsara, sacred discovery mood",
  },
  m4: {
    hook: "Persian garden chess conspiracy",
    subject: "scholar at mosaic chessboard, veiled princess across the board, cypress and palace tiles",
    palette: "lapis, turquoise, rose, saffron, parchment",
    composition: "Persian miniature with strict patterning, chessboard center, ornamental detail without text",
  },
  m5: {
    hook: "Byzantine warrior saint icon enraged in a museum depot",
    subject: "gold mosaic warrior saint half stepping out of cracked icon, museum shelves in darkness",
    palette: "gold, cobalt, ruby, soot black",
    composition: "icon frontal symmetry, tessera texture, one raised sword shape, no inscriptions",
  },
  m6: {
    hook: "blood rose confession in a midnight booth",
    subject: "armored knight behind stained glass, red rose light and confession booth lattice",
    palette: "ruby red, violet, sapphire, lead black",
    composition: "stained glass vertical panel, knight and rose shadow, dramatic sacred geometry",
  },
  m7: {
    hook: "apartment-night pact with a forest creature",
    subject: "young boy in small apartment doorway facing a huge gentle forest spirit, moonlit city beyond",
    palette: "soft green, warm apartment yellow, night blue, cream",
    composition: "Ghibli-like hand-painted warmth, creature fills side of frame, boy small and brave",
  },
  m8: {
    hook: "animation club survival day with a magical production board",
    subject: "student animator before glowing storyboard panels and scattered drawings",
    palette: "classroom amber, pastel blue, pencil gray, magic green",
    composition: "KyoAni clubroom scene, expressive boy in foreground, papers swirl like wings, no readable drawings",
  },
  m9: {
    hook: "twilight train station under a comet trail",
    subject: "young man on empty platform reaching toward a comet reflection on wet tracks",
    palette: "violet dusk, comet pink, station amber, deep blue",
    composition: "Makoto Shinkai style vertical depth, sky dominates, small figure and train lights below",
  },
  m10: {
    hook: "cybernetic rebel in an underground operating room",
    subject: "rogue with glowing cyber arm inside a sterile underground operating room, cables and surgical lamps only",
    palette: "electric cyan, surgical white, neon magenta, black metal",
    composition: "cyberpunk action portrait, diagonal arm glow, abstract medical machinery, no street signs, no neon words, no HUD, no readable panels",
  },
  m11: {
    hook: "moonlit clocktower promise",
    subject: "student holding a pocket watch on clocktower rooftop, distant beach memory reflected in clock glass",
    palette: "moon blue, silver, warm clock gold, soft lavender",
    composition: "romantic galgame CG, rooftop wind, watch as central object, no clock numerals",
  },
  m12: {
    hook: "stardust agent repairing a derelict bridge",
    subject: "pilot-mechanic repairing a fractured starship bridge, propeller-like engine and stars beyond",
    palette: "space navy, brass, orange sparks, cool steel",
    composition: "3D animated adventure still, dynamic repair pose, big window silhouette, no interface",
  },
  m13: {
    hook: "retro future dream in a neon plaza",
    subject: "stylish man with sunglasses, floating VHS-like rectangle shapes, neon plaza grid and sunset disk",
    palette: "purple, cyan, hot pink, orange, black",
    composition: "vaporwave fashion poster, bold graphic sunset, portrait clear, no readable signage",
  },
  m14: {
    hook: "minimal assassin crossing a desert dune",
    subject: "black-cloaked assassin silhouette crossing layered orange desert dunes, dagger-shaped shadow, distant fortress as a tiny geometric block",
    palette: "sand orange, burnt sienna, warm cream, black, tiny red accent",
    composition: "minimal vector poster but not empty, layered dune shapes fill the frame, sharp figure at lower third, large sun disk and long shadow",
  },
  m15: {
    hook: "prism warrior in a data void awakening",
    subject: "low-poly warrior with crystalline armor and floating broken heart crystal",
    palette: "violet, teal, emerald, black facets",
    composition: "faceted low-poly hero shot, fractured void shards, strong angular silhouette",
  },
  m16: {
    hook: "double life of a quiet librarian and hidden investigator",
    subject: "male profile merged with library shelves, rainy city street, pine forest, second shadow identity",
    palette: "monochrome, library amber, rain blue, pine green",
    composition: "double exposure profile, clean silhouette edge, psychological mystery cover",
  },
  m17: {
    hook: "retro pop-art hero before a gray ordinary street",
    subject: "confident pop-art man in cape pose, gray street behind exploding into primary-color comic panels",
    palette: "red, yellow, cyan, black, neutral gray",
    composition: "bold halftone hero poster, no speech bubbles, no punctuation, clean graphic energy",
  },
  m18: {
    hook: "data ghost in a hacker safehouse",
    subject: "rogue hacker facing a translucent ghostlike AI made of broken light shards",
    palette: "black, cyan, toxic green, small yellow highlights",
    composition: "glitch art two-figure scene, abstract shards and scanlines, no readable UI",
  },
  m19: {
    hook: "font conspiracy in a midnight design studio",
    subject: "male designer silhouette inside a pure Bauhaus architecture poster made only of large blank rectangles, circles, rulers, and red bars",
    palette: "Swiss red, black, white, gray",
    composition: "large geometric shapes only, strong clean grid, silhouette as focal point, no tiny marks, no texture details that resemble writing",
  },
  m20: {
    hook: "paper shadow legend in an ancestral house",
    subject: "paper-cut prince silhouette, ancestral staircase, giant cutout beast shadow on the wall",
    palette: "paper cream, ink black, candle amber, dark brown",
    composition: "multilayer papercut diorama, staircase depth, lace-like cut edges",
  },
  m21: {
    hook: "solar city engineer at the energy tower",
    subject: "eco-engineer holding a seed-like power cell below a bright vertical energy tower",
    palette: "solar gold, leaf green, sky blue, white glass",
    composition: "solarpunk optimistic city, upward vertical tower lines, bright airy atmosphere",
  },
  m22: {
    hook: "deep-sea echo in a submersible cockpit",
    subject: "investigator with lantern inside cracked cockpit, colossal eye-like shape in black water outside",
    palette: "abyss green, rust metal, lantern amber, emergency red",
    composition: "claustrophobic cockpit frame, human small vs vast ocean entity, no gore",
  },
  m23: {
    hook: "rain-night pursuit in a neon alley",
    subject: "detective under umbrella with second silhouette at alley end, wet bricks and reflected colored light",
    palette: "blue rain, violet, red accent, black",
    composition: "urban noir long alley perspective, detective foreground, no signs or readable neon",
  },
  m24: {
    hook: "priest's tea party as a cozy mystery",
    subject: "young priest-sleuth with tea cup and candle, parlor guests as shadowy suspects",
    palette: "warm amber, cream, tweed brown, cold moon blue through window",
    composition: "cozy mystery parlor tableau, tea steam forms clue shape, no book or label text",
  },
  m25: {
    hook: "thorn bridegroom in a gothic bedroom",
    subject: "gothic lord beside thorn-covered bed canopy, moonlit manor ruins visible through window",
    palette: "moon blue, black velvet, dried rose, pale silver",
    composition: "gothic romance portrait, thorn arch frames figure, candle and window light contrast",
  },
  m26: {
    hook: "candy house survivor returning to the forest",
    subject: "hunter with crossbow before candy cottage, old curse shadow in forest trees",
    palette: "dark forest green, candy cream, ember orange, red cloak accent",
    composition: "dark fairytale cover, cottage glowing in background, hunter silhouette strong, no gore",
  },
  m27: {
    hook: "wasteland raider abducts a bunker bride during a chase",
    subject: "rugged survivor and sheltered girl beside overturned armored car, silver medical box glowing",
    palette: "dust orange, rust, bunker white, radioactive green accent",
    composition: "post-apocalyptic chase aftermath, wide desert depth, box as focal object, no text markings",
  },
  m28: {
    hook: "hidden-world butler performing an exorcism at a tea party",
    subject: "suited butler-mage sealing a demon shadow rising from a teacup at an elegant hall",
    palette: "cyan magic, black suit, porcelain white, warm chandelier gold",
    composition: "urban fantasy action, spiral ward from teacup, guests blurred behind, no sigil text",
  },
  m29: {
    hook: "ink and fire poem bends reality in a midnight workspace",
    subject: "male profile, candle flame, geometric circles, ink brush shapes, reality folds around desk",
    palette: "emerald, antique gold, deep black, candle orange",
    composition: "abstract geometric literary cover, profile silhouette and flame, no glyphs or readable writing",
  },
};

const STYLE_DIRECTIVES = {
  oil: "painterly museum-quality oil illustration, visible brush texture, dramatic chiaroscuro, old-master depth",
  ink: "minimal Chinese ink wash, expressive blank space, dry brush edges, restrained mineral accent, paper texture",
  ukiyoe: "flat ukiyo-e woodblock print, carved outlines, limited pigment blocks, decorative textile patterns",
  fresco: "ancient mural fresco, cracked plaster, oxidized mineral pigments, sacred flattened perspective",
  miniature: "Persian miniature painting, patterned tiles, jewel colors, fine ornamental detail, flattened garden perspective",
  mosaic: "Byzantine mosaic icon, gold tesserae, frontal sacred geometry, jewel-like tile texture",
  stained: "stained glass panel, lead came lines, luminous colored glass, cathedral geometry",
  ghibli: "warm hand-painted animation background, soft watercolor texture, humane expressive character design",
  kyoani: "polished contemporary anime slice-of-life, delicate facial expression, clean room detail, soft natural light",
  shinkai: "cinematic anime realism, luminous sky, rain reflections, dramatic depth and bokeh",
  cyberpunk: "cinematic cyberpunk romance/action, wet neon reflections, chrome, cyan-magenta palette, no HUD",
  galgame: "premium visual-novel key art, soft emotional lighting, polished character rendering, romantic atmosphere",
  animation3d: "high-end animated film still, stylized 3D materials, expressive faces, cinematic lighting",
  vaporwave: "vaporwave poster, neon grid, retro-futurist fashion, surreal sunset geometry",
  vector: "minimal vector art, crisp silhouettes, flat colors, clean negative space",
  lowpoly: "faceted low-poly art, angular geometry, jewel-like planes, controlled lighting",
  double: "digital double exposure portrait, clean profile silhouette, layered environments inside the face",
  pop: "retro pop art, halftone dots, primary colors, thick black outlines, no speech bubbles",
  glitch: "glitch art portrait, fractured light shards, scanlines, chromatic corruption, no readable interface",
  swiss: "Swiss graphic poster design without typography, flat shapes, grids, red-black-white restraint",
  papercut: "multilayer papercut diorama, stacked paper shadows, lace-like cut edges, tactile craft texture",
  solarpunk: "bright solarpunk concept art, glass, plants, sunlit engineering, optimistic clean future",
  cosmic: "dark cosmic horror illustration, vast scale, wet darkness, red emergency light, dread without gore",
  noir: "modern urban noir, rain, deep shadows, reflective pavement, restrained cinematic color",
  cozy: "cozy mystery book-cover illustration, candlelit interiors, tactile props, warm-cold contrast",
  gothic: "gothic romance illustration, moonlit ruins, velvet shadows, roses, tragic elegance",
  fairytale: "dark fairytale illustration, storybook shapes, eerie forest, symbolic props, no gore",
  wasteland: "post-apocalyptic cinematic illustration, dust, rusted metal, harsh sun, survival props",
  urbanfantasy: "urban fantasy concept art, modern clothing plus magic, rain-slick city, elegant spell light",
  abstract: "abstract geometric literary cover, refined line art, circles and arcs, restrained mystical palette",
};

function styleKey(story) {
  const text = story.stylePrompt.toLowerCase();
  if (text.includes("oil")) return "oil";
  if (text.includes("ink wash")) return "ink";
  if (text.includes("ukiyo")) return "ukiyoe";
  if (text.includes("dunhuang") || text.includes("fresco")) return "fresco";
  if (text.includes("persian")) return "miniature";
  if (text.includes("byzantine")) return "mosaic";
  if (text.includes("stained")) return "stained";
  if (text.includes("ghibli")) return "ghibli";
  if (text.includes("kyoani")) return "kyoani";
  if (text.includes("shinkai")) return "shinkai";
  if (text.includes("cyberpunk")) return "cyberpunk";
  if (text.includes("galgame")) return "galgame";
  if (text.includes("3d animated")) return "animation3d";
  if (text.includes("vaporwave")) return "vaporwave";
  if (text.includes("vector")) return "vector";
  if (text.includes("low poly")) return "lowpoly";
  if (text.includes("double exposure")) return "double";
  if (text.includes("pop art")) return "pop";
  if (text.includes("glitch")) return "glitch";
  if (text.includes("swiss") || text.includes("typography")) return "swiss";
  if (text.includes("papercut")) return "papercut";
  if (text.includes("solar")) return "solarpunk";
  if (text.includes("cosmic")) return "cosmic";
  if (text.includes("noir")) return "noir";
  if (text.includes("cozy")) return "cozy";
  if (text.includes("gothic")) return "gothic";
  if (text.includes("fairytale")) return "fairytale";
  if (text.includes("post-apocalyptic")) return "wasteland";
  if (text.includes("urban fantasy")) return "urbanfantasy";
  if (text.includes("abstract")) return "abstract";
  return "oil";
}

function buildPrompt(story) {
  const brief = COVER_BRIEF[story.id];
  if (brief) {
    const directive = STYLE_DIRECTIVES[styleKey(story)];
    return [
      "Create a premium vertical 4:5 cover image for an interactive fiction story card.",
      `Story id: ${story.id}. Title for internal context only; do not render it: ${story.title}`,
      `Narrative hook: ${brief.hook}.`,
      `Primary cover subject: ${brief.subject}.`,
      `Art direction: ${directive}.`,
      `Color system: ${brief.palette}.`,
      `Composition: ${brief.composition}.`,
      "Cover quality: distinctive editorial/key-art composition, strong silhouette, clear focal object, readable on a small homepage card, polished finish.",
      "Avoid generic pretty portrait. The image must communicate this specific story through environment and symbolic objects.",
      "Hard constraints: no text, no title, no captions, no watermark, no logo, no UI, no readable signs, no numbers, no extra fingers, no distorted face, no gore.",
    ].join("\n");
  }

  if (story.id === "m16" && safePromptIds.has(story.id)) {
    return [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 双面人生",
      "Core visual idea: a quiet librarian with a hidden second identity, shown through a split double-exposure portrait.",
      "Scene: shelves of old books blend into a rain-slick city street at night, yellow window lights and subtle neon reflections.",
      "Subject: handsome reserved young man, calm face, half of the silhouette dissolving into pine trees, library aisles, and city shadows.",
      "Style: digital double exposure portrait, cinematic high contrast, black and white foundation with restrained yellow and blue accents.",
      "Composition: strong centered profile silhouette, elegant mystery mood, readable at small card size, no UI frame.",
      "Constraints: no words, no title text, no captions, no watermark, no logo, no explicit harm, no weapon.",
    ].join("\n");
  }

  if (story.id === "f23" && safePromptIds.has(story.id)) {
    return [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 暗巷蔷薇",
      "Core visual idea: a mysterious woman in a dark red trench coat and wide-brimmed hat standing in a rain-slick urban alley.",
      "Scene: wet brick alley, reflective puddles, steam vents, distant city bokeh, red and cyan light reflected on pavement.",
      "Subject: beautiful guarded woman, noir mood, one hand holding her collar, looking over her shoulder with quiet tension.",
      "Style: modern urban noir, high-contrast cinematic lighting, deep shadows, wet textures, refined cover art.",
      "Composition: strong foreground protagonist, alley depth behind her, readable at small card size, no UI frame.",
      "Constraints: no signs, no billboards, no posters, no text-like marks, no words anywhere, no letters, no title text, no captions, no watermark, no logo, no explicit harm.",
    ].join("\n");
  }

  const textlessOverrides = {
    f17: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 波普甜心",
      "Core visual idea: a confident retro pop-art heroine in a bright city street, expressive eyes and dramatic makeup.",
      "Style: pop art illustration, bold outlines, halftone dots, high-saturation red, yellow, cyan, and black shapes.",
      "Composition: clean portrait with abstract burst shapes and color blocks, no speech bubble.",
      "Constraints: no words, no letters, no punctuation marks, no exclamation mark, no signs, no captions, no watermark, no logo.",
    ],
    f18: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 系统纠错员",
      "Core visual idea: an elegant female hacker surrounded by broken light, holographic fragments, and abstract data shapes.",
      "Style: glitch art, cyan and magenta light, fractured portrait, futuristic dark mood.",
      "Composition: close portrait, abstract rectangles and scan lines only, no screen UI.",
      "Constraints: no readable interface, no words, no letters, no numbers, no icons, no captions, no watermark, no logo.",
    ],
    f19: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 排版爱情",
      "Core visual idea: a stylish female designer and a stylish male designer facing each other across a glowing red drafting table.",
      "Style: modern Swiss graphic design, red black white, geometric blocks, clean negative space.",
      "Composition: two clear human silhouettes, circles, grids, diagonal bars, romantic tension, high-contrast poster art.",
      "Constraints: no typography, no words, no letters, no numbers, no symbols, no captions, no watermark, no logo.",
    ],
    f10: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 霓虹恋人",
      "Core visual idea: a beautiful female scientist gently touching the cheek of a flawless male android in rainy neon streets.",
      "Style: cinematic cyberpunk anime realism, cyan and magenta reflections, soft futuristic romance.",
      "Composition: close two-person emotional scene, city bokeh and abstract holographic light only.",
      "Constraints: no screen UI, no labels, no words, no letters, no numbers, no signage text, no watermark, no logo.",
    ],
    f24: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 牧羊女的秘密",
      "Core visual idea: an elegant female sleuth at a warm candlelit village library window on a snowy night.",
      "Style: cozy mystery book cover illustration, warm amber interior, cold blue snow outside.",
      "Composition: heroine in foreground with magnifying glass, old books as texture, village lights beyond the window.",
      "Constraints: no readable book titles, no labels, no words, no letters, no numbers, no signs, no watermark, no logo.",
    ],
    f29: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 文字炼金术",
      "Core visual idea: an elegant female silhouette integrated with glowing alchemical geometry and a small candle flame.",
      "Style: abstract geometric book cover, emerald green, gold, deep blue, refined mystical mood.",
      "Composition: profile silhouette, circles, arcs, thin lines, luminous ink-like shapes, no book page text.",
      "Constraints: no runes, no glyphs, no words, no letters, no numbers, no captions, no watermark, no logo.",
    ],
    m17: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 波普英雄",
      "Core visual idea: a confident handsome male retro pop-art hero in bold color, heroic stance, dynamic comic energy.",
      "Style: pop art illustration, halftone dots, saturated primary colors, bold black outlines.",
      "Composition: male hero portrait with abstract radial color burst and geometric panels, no speech bubble.",
      "Constraints: no words, no letters, no punctuation marks, no exclamation mark, no signs, no captions, no watermark, no logo.",
    ],
    m18: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 数据幽灵",
      "Core visual idea: a male hacker encountering a luminous ghostlike AI figure made from abstract glitch light.",
      "Style: glitch art, dark cyber mood, cyan and yellow corruption fragments, scanline texture.",
      "Composition: tense two-figure scene, abstract data shards only, no screen UI.",
      "Constraints: no readable interface, no words, no letters, no numbers, no icons, no captions, no watermark, no logo.",
    ],
    m19: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 字体密谋",
      "Core visual idea: a stylish male designer silhouette inside a Swiss graphic conspiracy poster.",
      "Style: Swiss typography poster without typography, red black white, clean architectural grids and circles.",
      "Composition: profile silhouette, abstract document shapes, arrows as pure geometric triangles, tension and secrecy.",
      "Constraints: no typography, no words, no letters, no numbers, no symbols, no captions, no watermark, no logo.",
    ],
    m23: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 雨夜追猎",
      "Core visual idea: two modern noir figures in a rainy alley, distance and suspicion between them.",
      "Style: urban noir, cinematic blue and violet light, wet brick, reflective pavement, deep shadows.",
      "Composition: vertical alley depth, silhouettes under rain, abstract colored light only.",
      "Constraints: no signs, no billboards, no posters, no text-like marks, no words, no letters, no captions, no watermark, no logo.",
    ],
    m29: [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      "Story title for context only, do not render text: 墨与火之歌",
      "Core visual idea: a male profile silhouette beside a candle flame, ancient geometry bending reality.",
      "Style: abstract geometric book cover, emerald green, gold, black, controlled fire glow, elegant mysterious mood.",
      "Composition: profile, circles, arcs, straight lines, candle, ink and flame shapes, no visible writing.",
      "Constraints: no runes, no glyphs, no words, no letters, no numbers, no captions, no watermark, no logo.",
    ],
  };
  if (safePromptIds.has(story.id) && textlessOverrides[story.id]) {
    return textlessOverrides[story.id].join("\n");
  }

  if (safePromptIds.has(story.id)) {
    return [
      "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
      `Story title for context only, do not render text: ${story.title}`,
      `Core premise: ${compact(story.logline, 260)}`,
      `Visual style to preserve: ${story.stylePrompt}`,
      "Focus on atmosphere, identity, mystery, emotional tension, and cinematic composition.",
      "Composition: strong foreground protagonist, distinctive environment, clear dramatic lighting, readable at small card size, no UI frame.",
      "Constraints: no words, no title text, no captions, no watermark, no logo, no extra limbs, no distorted face, no explicit harm.",
    ].join("\n");
  }

  const nextHook = story.storyState?.nextHook ? `Opening hook: ${compact(story.storyState.nextHook, 260)}` : "";
  const scene = story.runtimeSummary?.sceneKey ? `Scene key: ${story.runtimeSummary.sceneKey}` : "";
  const cast = story.storyState?.castNotes ? `Character and conflict notes: ${compact(story.storyState.castNotes, 420)}` : "";
  const synopsis = story.synopsis ? `Synopsis: ${compact(story.synopsis, 420)}` : "";
  return [
    "Create a polished vertical 4:5 cover illustration for an interactive fiction story card.",
    `Story title for context only, do not render text: ${story.title}`,
    `Core premise: ${compact(story.logline, 360)}`,
    synopsis,
    cast,
    scene,
    nextHook,
    `Visual style to preserve: ${story.stylePrompt}`,
    "The image must communicate the specific story conflict, not just a generic character portrait.",
    "Composition: strong foreground protagonist, clear narrative object or threat, readable at small card size, cinematic depth, no UI frame.",
    "Constraints: no words, no title text, no captions, no watermark, no logo, no extra limbs, no distorted face.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function createTask(token, model, rule, story) {
  const prompt = buildPrompt(story);
  if (dryRun) return { story, prompt, taskId: null };
  const payload = {
    play_rule_id: rule.id,
    meta: buildMeta(rule, prompt),
    model_no: model.id,
    model_ver_no: model.model_ver_no,
    speed_type: 2,
    ss: SS,
  };
  const data = await postJson(token, "/api/v1/task/v5/create", payload);
  return { story, prompt, taskId: data.id };
}

async function pollTask(token, taskId) {
  const started = Date.now();
  while (Date.now() - started < 15 * 60 * 1000) {
    const data = await postJson(token, "/api/v1/task/batch-progress", {
      task_ids: [taskId],
      ss: SS,
    });
    const item = data.items?.[0];
    if (!item) throw new Error(`Task ${taskId} disappeared`);
    if (item.status === 3) {
      const image = item.img_uris?.find((img) => img.url);
      if (!image?.url) throw new Error(`Task ${taskId} completed without image URL`);
      return image.url;
    }
    if (item.status === 4) {
      throw new Error(item.status_desc ?? `Task ${taskId} failed`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`Task ${taskId} timed out`);
}

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function writeCover(story, imageBuffer) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const filename = `${story.id}.webp`;
  const target = path.join(OUT_DIR, filename);
  const backup = path.join(BACKUP_DIR, filename);
  if (fs.existsSync(target) && !fs.existsSync(backup)) {
    fs.copyFileSync(target, backup);
  }
  await sharp(imageBuffer)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toFile(target);
}

async function mapWithConcurrency(items, worker) {
  const results = [];
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const requestedIds = idArg
    ? new Set(idArg.split("=")[1].split(",").map((id) => id.trim()).filter(Boolean))
    : null;
  let stories = manifest.stories.filter((story) => all || requestedIds?.has(story.id));
  if (limitArg) stories = stories.slice(0, Number(limitArg.split("=")[1]));
  if (!stories.length) {
    throw new Error("No stories selected. Use --all or --ids=f0,m0.");
  }

  if (dryRun) {
    for (const story of stories) {
      console.log(`PROMPT ${story.id} ${story.title}\n${buildPrompt(story)}\n`);
    }
    return;
  }

  const token = readToken();
  const config = await postJson(token, "/api/v1/task/v5/config/model");
  const model = config.default_image_model.art_model;
  const params = await postJson(token, "/api/v1/task/v5/model-gen-param", {
    model_no: model.id,
    model_ver_no: model.model_ver_no,
  });
  const rule = pickTextRule(params);

  console.log(`MODEL ${model.id} ${model.model_ver_no}`);
  console.log(`RULE ${rule.id}`);
  console.log(`COUNT ${stories.length}`);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const promptLog = fs.existsSync(PROMPT_LOG_PATH)
    ? JSON.parse(fs.readFileSync(PROMPT_LOG_PATH, "utf8"))
    : {};
  const failures = [];

  await mapWithConcurrency(stories, async (story, index) => {
    try {
      console.log(`CREATE ${index + 1}/${stories.length} ${story.id} ${story.title}`);
      const task = await createTask(token, model, rule, story);
      promptLog[story.id] = {
        title: story.title,
        generatedAt: new Date().toISOString(),
        prompt: task.prompt,
      };
      fs.writeFileSync(PROMPT_LOG_PATH, JSON.stringify(promptLog, null, 2), "utf8");
      console.log(`TASK ${story.id} ${task.taskId}`);
      const url = await pollTask(token, task.taskId);
      console.log(`DOWNLOAD ${story.id}`);
      const image = await downloadImage(url);
      await writeCover(story, image);
      console.log(`DONE ${story.id} public/home/${story.id}.webp`);
    } catch (error) {
      failures.push({ id: story.id, error: error.message });
      console.error(`ERROR ${story.id} ${error.message}`);
    }
  });

  if (failures.length) {
    console.error(`FAILURES ${JSON.stringify(failures)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
