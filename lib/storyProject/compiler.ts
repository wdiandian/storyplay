import type { StartRequest } from "@storyplay/types";
import { renderStoryOutlineGuardrail } from "@/lib/storyProject/outlineCompiler";
import type { StoryProject } from "@/lib/storyProject/types";

export type StoryProjectCompileWarning = {
  field: string;
  message: string;
};

export type StoryProjectPlaytestBuild = {
  projectId: string;
  projectTitle: string;
  sourceActId: string;
  sourceSceneId: string;
  startRequest: StartRequest;
  warnings: StoryProjectCompileWarning[];
};

function compactLines(lines: Array<string | undefined | null | false>) {
  return lines
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean)
    .join("\n");
}

function section(title: string, body: string | string[]) {
  const content = Array.isArray(body) ? body.filter(Boolean).join("\n") : body.trim();
  return content ? `【${title}】\n${content}` : "";
}

function listItems(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

function pushMissing(warnings: StoryProjectCompileWarning[], field: string, message: string, value: string | string[]) {
  const missing = Array.isArray(value)
    ? value.filter((item) => item.trim()).length === 0
    : value.trim().length === 0;
  if (missing) warnings.push({ field, message });
}

function renderCharacterRelationships(project: StoryProject) {
  return project.characters
    .filter((character) => character.name.trim())
    .map((character) =>
      compactLines([
        `${character.name}（${character.role}）`,
        character.persona ? `性格/功能：${character.persona}` : "",
        character.relationshipToPlayer ? `与玩家关系：${character.relationshipToPlayer}` : "",
        character.visualNotes ? `视觉设定：${character.visualNotes}` : "",
        character.referenceImageUrl ? `参考图：${character.referenceImageUrl}` : "",
      ]),
    )
    .filter(Boolean)
    .join("\n\n");
}

function renderPreparedAssets(project: StoryProject) {
  const assetLines = project.assets
    .filter((asset) => asset.url.trim())
    .map((asset) => `${asset.kind}: ${asset.title || asset.url} (${asset.url})`);
  const characterRefs = project.characters
    .filter((character) => character.referenceImageUrl.trim())
    .map((character) => `character-reference: ${character.name} (${character.referenceImageUrl})`);
  return [...assetLines, ...characterRefs].join("\n");
}

function renderInteractionStrategy(project: StoryProject) {
  return compactLines([
    `玩法模式：${project.interaction.playMode}`,
    `选项密度：${project.interaction.choiceDensity}`,
    `分支策略：${project.interaction.branchingMode}`,
    `自由输入：${project.interaction.freeformInputMode}`,
    `视觉生成：${project.interaction.visualGenerationMode}`,
    `兼容字段互动强度：${project.interaction.intensity}`,
    project.interaction.choiceStyle,
    project.interaction.branchNotes,
  ]);
}

export function compileStoryProjectToStartRequest(project: StoryProject): StoryProjectPlaytestBuild {
  const warnings: StoryProjectCompileWarning[] = [];
  const selectedAct =
    project.structure.acts.find((act) => act.id === project.structure.selectedActId) ??
    project.structure.acts[0];
  const selectedScene =
    selectedAct?.scenes.find((scene) => scene.id === project.structure.selectedSceneId) ??
    selectedAct?.scenes[0];

  pushMissing(warnings, "logline", "缺少一句话概念，首幕钩子会不够稳定。", project.logline);
  pushMissing(warnings, "synopsis", "缺少故事简介，生成链路只能依赖零散设定。", project.synopsis);
  pushMissing(warnings, "world.setting", "缺少世界观设定，场景约束会偏弱。", project.world.setting);
  pushMissing(warnings, "visual.stylePrompt", "缺少视觉风格，已回退为自动匹配。", project.visual.stylePrompt);
  pushMissing(warnings, "storyOutline.mainGoal", "缺少剧情大纲主线目标，后续生成更容易跑偏。", project.storyOutline.mainGoal);
  if (!selectedAct) warnings.push({ field: "structure.acts", message: "缺少故事幕结构，试玩会回退到基础字段。" });
  if (!selectedScene) warnings.push({ field: "structure.scenes", message: "缺少场景规划，试玩开场会缺少明确目标。" });

  const worldSetting = compactLines([
    section("项目", project.title),
    section("一句话概念", project.logline),
    section("故事简介", project.synopsis),
    section("目标受众", project.audience),
    section("类型", project.genres.join(" / ")),
    section("情绪", project.moods.join(" / ")),
    section("世界观", project.world.setting),
    section("世界规则", project.world.rules),
    section("主要地点", project.world.locations),
    section("叙事调性", project.world.tone),
    section("主角 / 玩家位置", project.narrative.protagonist),
    section("核心冲突", project.narrative.coreConflict),
    section("关键谜题", listItems(project.narrative.keyMysteries)),
    section("章节目标", project.narrative.chapterGoals),
    section("剧情大纲护栏", renderStoryOutlineGuardrail(project)),
    section("人物关系与配角", compactLines([
      project.storyOutline.relationshipArc,
      project.storyOutline.supportingCast,
      renderCharacterRelationships(project),
    ])),
    section("预生产资产", renderPreparedAssets(project)),
    section("当前试玩幕", compactLines([
      selectedAct?.title,
      selectedAct?.goal ? `目标：${selectedAct.goal}` : "",
      selectedAct?.conflict ? `冲突：${selectedAct.conflict}` : "",
      selectedAct?.pacing ? `节奏：${selectedAct.pacing}` : "",
      selectedAct?.notes,
    ])),
    section("当前试玩场景", compactLines([
      selectedScene?.title,
      selectedScene?.location ? `地点：${selectedScene.location}` : "",
      selectedScene?.characters.length ? `出场角色：${selectedScene.characters.join(" / ")}` : "",
      selectedScene?.purpose ? `剧情目的：${selectedScene.purpose}` : "",
      selectedScene?.openingEvent ? `开场事件：${selectedScene.openingEvent}` : "",
      selectedScene?.playerChoices.length ? `预期选择点：${selectedScene.playerChoices.join(" / ")}` : "",
      selectedScene?.emotionalBeat ? `情绪节拍：${selectedScene.emotionalBeat}` : "",
      selectedScene?.notes,
    ])),
    section("互动策略", compactLines([
      renderInteractionStrategy(project),
      project.interaction.freeformInput ? "兼容字段：允许玩家自由输入行动。" : "兼容字段：不鼓励玩家自由输入行动。",
    ])),
    section("创作者备注", project.narrative.creatorNotes),
  ]);

  const styleGuide = project.visual.stylePrompt.trim() || project.runtimePolicy.styleGuide.trim() || "auto";

  return {
    projectId: project.id,
    projectTitle: project.title,
    sourceActId: selectedAct?.id ?? "",
    sourceSceneId: selectedScene?.id ?? "",
    startRequest: {
      worldSetting,
      styleGuide,
      orientation: project.runtimePolicy.orientation,
      language: project.language,
    },
    warnings,
  };
}
