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

const emptyProject = createStoryProject({ title: "", logline: "", synopsis: "" });
const localDiagnose = diagnoseStoryProjectLocally(emptyProject);
assert.equal(localDiagnose.suggestions.some((item) => item.severity === "critical"), true);
assert.equal(localDiagnose.nextActions.length > 0, true);

console.log("creator-assistant tests passed");
