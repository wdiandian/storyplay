import assert from "node:assert/strict";

const {
  createStoryProject,
  createStoryProjectCharacter,
} = await import(new URL("../lib/storyProject/types.ts", import.meta.url).href);
const {
  hasCreatorStoryAssistantPatch,
  mergeCreatorStoryAssistantPatch,
  previewCreatorStoryAssistantPatch,
} = await import(new URL("../lib/creatorAssistant/mergePatch.ts", import.meta.url).href);
const {
  parseCreatorStoryAssistantOutput,
} = await import(new URL("../lib/creatorAssistant/parser.ts", import.meta.url).href);
const {
  filterCreatorAssistantOutputForSkill,
} = await import(new URL("../lib/creatorAssistant/skillPatchFilter.ts", import.meta.url).href);
const {
  diagnoseStoryProjectLocally,
} = await import(new URL("../lib/creatorAssistant/localDiagnose.ts", import.meta.url).href);

const baseProject = createStoryProject({
  title: "旧标题",
  logline: "旧概念",
  world: { setting: "旧世界" },
});
baseProject.publish = { status: "published", skuId: "sku_existing" };
baseProject.generation = {
  status: "ready",
  firstActPath: "/first-act.json",
  lastGeneratedAt: "2026-01-01T00:00:00.000Z",
  message: "ready",
};
baseProject.playtests = [
  {
    id: "pt_1",
    status: "created",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sourceProjectUpdatedAt: "2026-01-01T00:00:00.000Z",
    sourceActId: baseProject.structure.selectedActId,
    sourceSceneId: baseProject.structure.selectedSceneId,
    startRequest: { worldSetting: "old", styleGuide: "old" },
    warnings: [],
    sessionId: "",
    summary: "",
    firstSceneId: "",
    firstSceneKey: "",
    firstSceneImageUrl: "",
    sceneCount: 0,
    characterCount: 0,
    notes: "",
  },
];
baseProject.characters = [
  createStoryProjectCharacter({
    id: "char_locked",
    name: "林晚",
    persona: "锁定设定",
    locked: true,
  }),
];

const parsed = parseCreatorStoryAssistantOutput(JSON.stringify({
  summary: "已补强",
  suggestions: [
    { severity: "warning", field: "storyOutline.mainGoal", message: "主线目标偏弱" },
  ],
  patch: {
    title: "新标题",
    world: { setting: "新世界" },
    publish: { status: "draft" },
    playtests: [],
    characters: [
      { id: "char_locked", name: "林晚", persona: "不应覆盖", locked: false },
      { name: "夏海", role: "main", persona: "关键同伴", relationshipToPlayer: "互相试探" },
    ],
  },
  patchNotes: [
    { field: "title", before: "旧标题", after: "新标题", reason: "提升辨识度" },
  ],
  nextActions: ["保存工程"],
}));

assert.equal(parsed.summary, "已补强");
assert.equal(parsed.suggestions.length, 1);
assert.equal(hasCreatorStoryAssistantPatch(parsed.patch), true);

const merged = mergeCreatorStoryAssistantPatch(baseProject, parsed.patch);
assert.equal(merged.title, "新标题");
assert.equal(merged.world.setting, "新世界");
assert.equal(merged.publish.status, "published");
assert.equal(merged.publish.skuId, "sku_existing");
assert.equal(merged.generation.status, "ready");
assert.equal(merged.playtests.length, 1);

const locked = merged.characters.find((character) => character.id === "char_locked");
assert.equal(locked?.persona, "锁定设定");
assert.equal(locked?.locked, true);

const generated = merged.characters.find((character) => character.name === "夏海");
assert.equal(generated?.source, "ai-generated");
assert.equal(generated?.relationshipToPlayer, "互相试探");

const preview = previewCreatorStoryAssistantPatch(baseProject, parsed.patch);
assert.equal(preview.some((item) => item.field === "title" && item.after === "新标题"), true);
assert.equal(preview.some((item) => item.field === "publish.status"), false);

const fallback = parseCreatorStoryAssistantOutput("not json");
assert.equal(fallback.patchNotes.length, 0);
assert.equal(fallback.patch && Object.keys(fallback.patch).length, 0);
assert.equal(fallback.suggestions[0]?.field, "assistant");

const worldOnly = parseCreatorStoryAssistantOutput(JSON.stringify({
  summary: "world",
  patch: {
    title: "should drop",
    world: { setting: "allowed world" },
    assets: [{ kind: "cover", title: "should drop" }],
  },
}), { targetSection: "world" });
assert.equal(worldOnly.patch.title, undefined);
assert.equal(worldOnly.patch.assets, undefined);
assert.equal(worldOnly.patch.world?.setting, "allowed world");

const assetOnly = parseCreatorStoryAssistantOutput(JSON.stringify({
  summary: "asset",
  patch: {
    assets: [
      {
        id: "asset_1",
        kind: "cover",
        title: "cover prompt",
        prompt: "draw cover",
        url: "https://fake.invalid/image.png",
        status: "ready",
        provider: "fake",
        model: "fake",
        notes: "safe notes",
      },
    ],
  },
}), { targetSection: "assets" });
assert.equal(assetOnly.patch.assets?.[0]?.title, "cover prompt");
assert.equal(assetOnly.patch.assets?.[0]?.prompt, "draw cover");
assert.equal(assetOnly.patch.assets?.[0]?.url, undefined);
assert.equal(assetOnly.patch.assets?.[0]?.status, undefined);
assert.equal(assetOnly.patch.assets?.[0]?.provider, undefined);
assert.equal(assetOnly.patch.assets?.[0]?.model, undefined);

const characterOnly = parseCreatorStoryAssistantOutput(JSON.stringify({
  summary: "character",
  patch: {
    characters: [
      {
        name: "A",
        role: "main",
        referenceImagePrompt: "portrait prompt",
        referenceImageUrl: "https://fake.invalid/char.png",
        referenceImageStatus: "ready",
      },
    ],
  },
}), { targetSection: "characters" });
assert.equal(characterOnly.patch.characters?.[0]?.referenceImagePrompt, "portrait prompt");
assert.equal(characterOnly.patch.characters?.[0]?.referenceImageUrl, undefined);
assert.equal(characterOnly.patch.characters?.[0]?.referenceImageStatus, undefined);

const basicsOnly = parseCreatorStoryAssistantOutput(JSON.stringify({
  summary: "basics",
  patch: {
    narrative: {
      protagonist: "allowed protagonist",
      coreConflict: "allowed conflict",
      creatorNotes: "should drop",
      chapterGoals: "should drop",
      keyMysteries: ["should drop"],
    },
  },
}), { targetSection: "basics" });
assert.equal(basicsOnly.patch.narrative?.protagonist, "allowed protagonist");
assert.equal(basicsOnly.patch.narrative?.coreConflict, "allowed conflict");
assert.equal(basicsOnly.patch.narrative?.creatorNotes, undefined);
assert.equal(basicsOnly.patch.narrative?.chapterGoals, undefined);
assert.equal(basicsOnly.patch.narrative?.keyMysteries, undefined);

const visualOnly = parseCreatorStoryAssistantOutput(JSON.stringify({
  summary: "visual",
  patch: {
    visual: { stylePrompt: "allowed style" },
    runtimePolicy: { styleGuide: "allowed guide", orientation: "portrait" },
    interaction: {
      visualGenerationMode: "key-scenes",
      playMode: "free-explore",
      choiceDensity: "high",
    },
  },
}), { targetSection: "visual" });
assert.equal(visualOnly.patch.visual?.stylePrompt, "allowed style");
assert.equal(visualOnly.patch.runtimePolicy?.styleGuide, "allowed guide");
assert.equal(visualOnly.patch.runtimePolicy?.orientation, undefined);
assert.equal(visualOnly.patch.interaction?.visualGenerationMode, "key-scenes");
assert.equal(visualOnly.patch.interaction?.playMode, undefined);
assert.equal(visualOnly.patch.interaction?.choiceDensity, undefined);

const emptyProject = createStoryProject({ title: "", logline: "", synopsis: "" });
const localDiagnose = diagnoseStoryProjectLocally(emptyProject);
assert.equal(localDiagnose.suggestions.some((item) => item.severity === "critical"), true);
assert.equal(localDiagnose.nextActions.length > 0, true);
const localWorldDiagnose = filterCreatorAssistantOutputForSkill(localDiagnose, "world");
assert.equal(localWorldDiagnose.patch.interaction, undefined);
const localVisualDiagnose = filterCreatorAssistantOutputForSkill(localDiagnose, "visual");
assert.equal(localVisualDiagnose.patch.interaction?.choiceStyle, undefined);

console.log("creator-assistant tests passed");
