import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  characterDesignerContract,
  cinematographerContract,
  getAgentRegistryEntry,
  listAgentInventory,
  runAgent,
  styleSelectorContract,
  writerContract,
} = await import(new URL("../lib/engine/agent-system/index.ts", import.meta.url).href);
const { collectReferenceImages } = await import(
  new URL("../lib/engine/agents/painter.ts", import.meta.url).href
);
const {
  coercePlanFromRaw,
  minimalFallbackPlan,
  synthesizeFallbackBeats,
} = await import(new URL("../lib/engine/agents/writer.ts", import.meta.url).href);
const { parseFreeformClassifyOutput } = await import(
  new URL(
    "../lib/engine/agent-system/agents/freeform-classifier/parser.ts",
    import.meta.url,
  ).href
);
const { parseVisionOutput } = await import(
  new URL(
    "../lib/engine/agent-system/agents/vision/parser.ts",
    import.meta.url,
  ).href
);
const { parseInsertBeatOutput } = await import(
  new URL(
    "../lib/engine/agent-system/agents/insert-beat/parser.ts",
    import.meta.url,
  ).href
);
const { buildFallbackVoiceDescription } = await import(
  new URL("../lib/engine/director.ts", import.meta.url).href
);

async function loadAgentFixture(relativePath) {
  const url = new URL(
    `../lib/engine/agent-system/agents/${relativePath}`,
    import.meta.url,
  );
  return JSON.parse(await readFile(url, "utf8"));
}

function assertNoMojibake(value, label) {
  const text = JSON.stringify(value);
  assert.equal(
    /鈥|鈫|銈|鐢|閫夐|缁х画|鏁呬簨|鏈寚|璇锋牴|浣\?|\{name\}|\{session\.worldSetting\}/.test(text),
    false,
    `${label} should not contain mojibake or broken template placeholders`,
  );
}

const inventory = listAgentInventory();
assert.equal(inventory.length, 9, "agent inventory should contain 9 entries");

const ids = inventory.map((item) => item.id).sort();
assert.deepEqual(ids, [
  "character-designer",
  "cinematographer",
  "freeform-classifier",
  "insert-beat",
  "painter",
  "style-selector",
  "vision",
  "voice",
  "writer",
].sort());

const style = getAgentRegistryEntry("style-selector");
assert.equal(style.modelRole, "text");
assert.equal(style.kind, "llm");

const styleFallbackFixture = await loadAgentFixture(
  "style-selector/fixtures/fallback-runtime.json",
);
const fallbackResult = await runAgent(
  {
    ...styleSelectorContract,
    fallback: () => styleFallbackFixture.fallbackOutput,
  },
  styleFallbackFixture.input,
  async () => {
    throw new Error("forced failure");
  },
);

assert.equal(fallbackResult.ok, styleFallbackFixture.expected.ok);
assert.equal(fallbackResult.output, styleFallbackFixture.expected.output);
assert.equal(fallbackResult.agentId, styleFallbackFixture.expected.agentId);

const writerMessages = writerContract.buildMessages({
  id: "s1",
  worldSetting: "A rain-soaked school mystery",
  styleGuide: "cinematic anime",
  characters: [],
  history: [],
});
assert.ok(writerMessages.length > 0);
assert.equal(writerMessages[0].role, "system");

const writerPlanFixture = await loadAgentFixture(
  "writer/fixtures/plan-missing-fields.json",
);
const coercedPlan = coercePlanFromRaw(writerPlanFixture.rawPlan);
assert.equal(coercedPlan.sceneSummary, writerPlanFixture.expected.sceneSummary);
assert.equal(coercedPlan.sceneKey, writerPlanFixture.expected.sceneKey);
assert.equal(coercedPlan.entryBeatId, writerPlanFixture.expected.entryBeatId);
assert.deepEqual(coercedPlan.cast, writerPlanFixture.expected.cast);

const fallbackPlan = minimalFallbackPlan();
const fallbackBeats = synthesizeFallbackBeats(fallbackPlan);
assert.equal(fallbackBeats.length, 1);
assert.equal(fallbackBeats[0].id, "b1");
assert.equal(fallbackBeats[0].next.type, "choice");
assertNoMojibake(fallbackPlan, "writer minimal fallback plan");
assertNoMojibake(fallbackBeats, "writer fallback beats");

const fallbackVoiceDescription = buildFallbackVoiceDescription(
  "林晚",
  { worldSetting: "雨夜校园怪谈" },
);
assert.equal(
  fallbackVoiceDescription,
  "请根据角色名「林晚」推断其性别、年龄与气质。所属世界观：雨夜校园怪谈",
);
assertNoMojibake(fallbackVoiceDescription, "character voice fallback");

const characterInvalidJsonFixture = await loadAgentFixture(
  "character-designer/fixtures/invalid-json.json",
);
const fixtureCharacterDesign = characterDesignerContract.parseOutput(
  characterInvalidJsonFixture.rawOutput,
  characterInvalidJsonFixture.input,
);
assert.deepEqual(fixtureCharacterDesign, characterInvalidJsonFixture.expected);

const cinemaFallbackFixture = await loadAgentFixture(
  "cinematographer/fixtures/empty-output-fallback.json",
);
const cinemaOutput = cinematographerContract.parseOutput(
  JSON.stringify(cinemaFallbackFixture.rawOutput),
  cinemaFallbackFixture.input,
);
assert.equal(cinemaOutput.shotType, cinemaFallbackFixture.expected.shotType);
assert.ok(
  cinemaOutput.integratedPrompt.includes(
    cinemaFallbackFixture.expected.integratedPromptIncludes,
  ),
);

const painterReferenceFixture = await loadAgentFixture(
  "painter/fixtures/reference-priority.json",
);
const fixtureRefs = collectReferenceImages(
  painterReferenceFixture.characters,
  painterReferenceFixture.beat,
  painterReferenceFixture.priorSceneImage,
  painterReferenceFixture.styleReferenceImage,
);
assert.deepEqual(fixtureRefs, painterReferenceFixture.expectedRefs);

const freeformInvalidFixture = await loadAgentFixture(
  "freeform-classifier/fixtures/invalid-classify-fallback.json",
);
const parsedFreeform = parseFreeformClassifyOutput(
  JSON.stringify(freeformInvalidFixture.rawOutput),
  freeformInvalidFixture.input,
);
assert.deepEqual(parsedFreeform, freeformInvalidFixture.expected);

const visionInvalidFixture = await loadAgentFixture(
  "vision/fixtures/invalid-classify-fallback.json",
);
const parsedVision = parseVisionOutput(
  JSON.stringify(visionInvalidFixture.rawOutput),
);
assert.deepEqual(parsedVision, visionInvalidFixture.expected);
assertNoMojibake(parsedVision, "vision fallback");

for (const fixturePath of [
  "insert-beat/fixtures/empty-output-fallback.json",
  "insert-beat/fixtures/pov-line-delivery.json",
]) {
  const fixture = await loadAgentFixture(fixturePath);
  const parsedInsertBeat = parseInsertBeatOutput(
    JSON.stringify(fixture.rawOutput),
  );
  if (fixture.expected.lineDelivery === null) {
    assert.equal(parsedInsertBeat.lineDelivery, undefined);
    delete parsedInsertBeat.lineDelivery;
    delete fixture.expected.lineDelivery;
  }
  assert.deepEqual(parsedInsertBeat, fixture.expected);
  assertNoMojibake(parsedInsertBeat, `insert beat fixture ${fixturePath}`);
}

for (const fixturePath of ["voice/fixtures/contract-metadata.json"]) {
  const fixture = await loadAgentFixture(fixturePath);
  const entry = getAgentRegistryEntry(fixture.agentId);
  assert.equal(entry.kind, fixture.expected.kind, `${fixture.agentId} kind`);
  assert.equal(
    entry.modelRole,
    fixture.expected.modelRole,
    `${fixture.agentId} modelRole`,
  );
  assert.equal(
    entry.contract.inputSchema.name,
    fixture.expected.inputSchema,
    `${fixture.agentId} input schema`,
  );
  assert.equal(
    entry.contract.outputSchema.name,
    fixture.expected.outputSchema,
    `${fixture.agentId} output schema`,
  );
}

console.log("agent-system smoke tests passed");
