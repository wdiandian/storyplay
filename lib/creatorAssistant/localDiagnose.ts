import type { StoryProject } from "@/lib/storyProject/types";
import type {
  CreatorStoryAssistantOutput,
  CreatorStoryAssistantSuggestion,
  StoryProjectPatch,
} from "./types";

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function warning(field: string, message: string): CreatorStoryAssistantSuggestion {
  return { severity: "warning", field, message };
}

function critical(field: string, message: string): CreatorStoryAssistantSuggestion {
  return { severity: "critical", field, message };
}

function info(field: string, message: string): CreatorStoryAssistantSuggestion {
  return { severity: "info", field, message };
}

export function diagnoseStoryProjectLocally(project: StoryProject): CreatorStoryAssistantOutput {
  const suggestions: CreatorStoryAssistantSuggestion[] = [];
  const patch: StoryProjectPatch = {};
  const patchNotes: CreatorStoryAssistantOutput["patchNotes"] = [];
  const nextActions: string[] = [];

  if (!hasText(project.title)) {
    suggestions.push(critical("title", "缺少工程标题。上线前至少需要一个可识别的作品名。"));
    nextActions.push("先补工程标题");
  }

  if (!hasText(project.logline) && !hasText(project.synopsis)) {
    suggestions.push(critical("logline", "缺少一句话概念或故事简介，试玩生成会缺少核心方向。"));
    nextActions.push("补一句话概念和故事简介");
  } else if (!hasText(project.logline)) {
    suggestions.push(warning("logline", "建议补一句话概念，方便后台列表、发布包装和模型快速理解作品卖点。"));
  } else if (project.logline.trim().length < 12) {
    suggestions.push(warning("logline", "一句话概念偏短，建议包含主角、冲突和体验钩子。"));
  }

  if (!hasText(project.world.setting)) {
    suggestions.push(warning("world.setting", "世界设定为空，模型容易把场景、规则和时代背景补得不稳定。"));
    nextActions.push("补世界设定");
  }
  if (!hasText(project.world.rules)) {
    suggestions.push(info("world.rules", "可以补充世界规则，约束模型不要随意改设定。"));
  }
  if (!hasText(project.world.tone)) {
    suggestions.push(info("world.tone", "建议写清叙事调性，例如悬疑、轻喜、压抑、浪漫或电影感。"));
  }

  if (!hasText(project.narrative.protagonist)) {
    suggestions.push(warning("narrative.protagonist", "缺少主角或玩家位置，互动故事会缺少代入视角。"));
  }
  if (!hasText(project.narrative.coreConflict)) {
    suggestions.push(warning("narrative.coreConflict", "缺少核心冲突，后续章节容易变成散点事件。"));
  }

  if (!hasText(project.storyOutline.mainGoal)) {
    suggestions.push(warning("storyOutline.mainGoal", "缺少主线目标，AI 续写时更容易跑偏。"));
    nextActions.push("补主线目标");
  }
  if (!hasText(project.storyOutline.phaseOutline)) {
    suggestions.push(info("storyOutline.phaseOutline", "建议补阶段大纲，让后续章节有清晰推进顺序。"));
  }
  if (project.storyOutline.requiredBeats.length === 0) {
    suggestions.push(info("storyOutline.requiredBeats", "建议列出必达剧情节点，允许玩家改变过程，但保留主线骨架。"));
  }
  if (project.storyOutline.guardrails.length === 0) {
    suggestions.push(info("storyOutline.guardrails", "建议补禁止跑偏规则，例如不要突然换题材、不要杀死关键角色。"));
  }

  if (project.characters.length === 0) {
    suggestions.push(warning("characters", "当前没有角色卡。至少建议补主角和一个关键关系角色。"));
    nextActions.push("补关键角色卡");
  } else {
    const emptyCharacters = project.characters.filter((character) =>
      !hasText(character.persona) || !hasText(character.relationshipToPlayer)
    );
    if (emptyCharacters.length > 0) {
      suggestions.push(info("characters", `${emptyCharacters.length} 个角色缺少人格或关系定位，建议补齐后再试玩。`));
    }
  }

  if (!hasText(project.visual.stylePrompt) && !hasText(project.runtimePolicy.styleGuide)) {
    suggestions.push(info("visual.stylePrompt", "建议补视觉风格，避免首图和后续背景图风格漂移。"));
  }

  if (project.openingPackage.status === "empty") {
    suggestions.push(info("openingPackage", "当前未启用固定首场。MVP 可先依赖模型生成首场，但上线前建议补固定开场以稳定首屏体验。"));
  }

  if (!project.interaction.choiceStyle.trim()) {
    patch.interaction = {
      choiceStyle: "关键选择推动剧情，普通选择用于探索关系、线索和情绪变化。",
    };
    patchNotes.push({
      field: "interaction.choiceStyle",
      before: "",
      after: patch.interaction.choiceStyle,
      reason: "补一个保守的互动默认值，让试玩生成更稳定。",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push(info("project", "基础创作字段已经比较完整，可以进入试玩并根据结果继续调整。"));
    nextActions.push("生成试玩并观察首场体验");
  }

  return {
    summary:
      suggestions.some((item) => item.severity === "critical")
        ? "本地诊断发现上线前必须补齐的创作字段。"
        : "本地诊断已完成，当前工程可以继续补强后进入试玩。",
    suggestions,
    patch,
    patchNotes,
    nextActions: nextActions.length > 0 ? nextActions : ["运行试玩", "根据试玩结果调整大纲和角色关系"],
  };
}
