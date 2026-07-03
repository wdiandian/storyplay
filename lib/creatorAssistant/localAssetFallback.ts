import type { StoryProjectAssetKind } from "@/lib/storyProject/types";
import type {
  CreatorStoryAssistantInput,
  CreatorStoryAssistantOutput,
  CreatorStoryAssistantTargetSection,
} from "./types";
import { filterCreatorAssistantOutputForSkill } from "./skillPatchFilter";

function compact(value: string | undefined) {
  return value?.trim() || "";
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function inferAssetKind(input: CreatorStoryAssistantInput): StoryProjectAssetKind | undefined {
  if (input.targetSection !== "assets") return undefined;
  const instruction = [
    input.userInstruction,
    ...(input.conversation ?? []).slice(-3).map((message) => message.content),
  ].join("\n").toLowerCase();

  if (includesAny(instruction, ["封面", "cover"])) return "cover";
  if (includesAny(instruction, ["首场", "首图", "first-scene", "first scene"])) return "first-scene";
  if (includesAny(instruction, ["角色参考", "character-reference", "character reference"])) {
    return "character-reference";
  }
  if (includesAny(instruction, ["风格参考", "style-reference", "style reference"])) return "style-reference";
  return undefined;
}

function projectContext(input: CreatorStoryAssistantInput) {
  const { project } = input;
  const title = compact(project.title) || "未命名故事";
  const hook = compact(project.logline) || compact(project.synopsis) || "互动故事";
  const world = compact(project.world.setting) || compact(project.world.tone) || "故事核心场景";
  const style = compact(project.visual.stylePrompt) || compact(project.runtimePolicy.styleGuide) || "电影感叙事视觉";
  const protagonist = compact(project.narrative.protagonist) || "核心角色";
  const conflict = compact(project.narrative.coreConflict) || compact(project.storyOutline.mainGoal) || "关键冲突";
  const moods = [...project.genres, ...project.moods, ...project.tags].filter(Boolean).slice(0, 6).join("、");
  return { title, hook, world, style, protagonist, conflict, moods };
}

function buildPromptForKind(input: CreatorStoryAssistantInput, kind: StoryProjectAssetKind) {
  const context = projectContext(input);
  if (kind === "first-scene") {
    return [
      `${context.title} 的首场背景图。`,
      `画面围绕：${context.world}。`,
      `玩家视角/主角位置：${context.protagonist}。`,
      `核心冲突暗示：${context.conflict}。`,
      `视觉风格：${context.style}。`,
      context.moods ? `情绪标签：${context.moods}。` : "",
      "构图要求：适合作为互动影游开场画面，留出角色与 UI 空间，避免文字、水印、logo。",
    ].filter(Boolean).join("\n");
  }

  if (kind === "character-reference") {
    const character = input.project.characters.find((item) => item.role !== "temporary") ?? input.project.characters[0];
    const name = compact(character?.name) || context.protagonist;
    return [
      `生成一张比例为 16:9 的宽屏人物设定卡，专业美术设定集质感，高级极简双栏排版，干净的深色或中性色背景。`,
      `角色：${name}。`,
      character?.persona ? `人物气质：${character.persona}` : `人物气质：${context.protagonist}`,
      character?.relationshipToPlayer ? `与玩家关系：${character.relationshipToPlayer}` : "",
      character?.visualNotes ? `视觉备注：${character.visualNotes}` : "",
      `故事冲突暗示：${context.conflict}。`,
      `视觉风格：${context.style}。`,
      "【左侧区域】：占画面约 40%，展示人物超清面部特写，只包含头部与少量肩颈。五官、皮肤质感、发丝、眉眼、妆容、疤痕或特殊标记清晰可见，电影级人像摄影，伦勃朗光，柔和补光，轻微边缘光。",
      "【右侧区域】：占画面约 60%，并排展示同一人物的三视图全身站姿：正面、侧面、背面。三张全身像保持同一人物、同一服装、同一比例、同一身高和同一光照条件。",
      "人物自然直立，双脚平稳站立，姿态中性，服装结构、材质、鞋履和背面细节完整可见，适合作为角色建模和绘画参考。",
      "禁止文字、标题、字幕、UI、Logo、水印、图标、标签、装饰、复杂场景、动作表演、多套服装和无关道具。",
    ].filter(Boolean).join("\n");
  }

  if (kind === "style-reference") {
    return [
      `${context.title} 的整体视觉风格参考。`,
      `故事钩子：${context.hook}。`,
      `世界与氛围：${context.world}。`,
      `目标风格：${context.style}。`,
      context.moods ? `情绪标签：${context.moods}。` : "",
      "构图要求：作为后续场景图统一参考，强调色彩、光影、镜头语言和材质，不要文字、水印、logo。",
    ].filter(Boolean).join("\n");
  }

  return [
    `${context.title} 的封面图。`,
    `一句话钩子：${context.hook}。`,
    `主角/玩家位置：${context.protagonist}。`,
    `核心冲突：${context.conflict}。`,
    `世界与氛围：${context.world}。`,
    `视觉风格：${context.style}。`,
    context.moods ? `情绪标签：${context.moods}。` : "",
    "构图要求：适合首页卡片和故事封面，主体明确，强情绪钩子，竖版优先，避免文字、水印、logo。",
  ].filter(Boolean).join("\n");
}

function titleForKind(kind: StoryProjectAssetKind) {
  if (kind === "first-scene") return "首场图提示词";
  if (kind === "character-reference") return "角色参考图提示词";
  if (kind === "style-reference") return "风格参考图提示词";
  return "封面图提示词";
}

export function buildLocalAssetAssistantFallback(
  input: CreatorStoryAssistantInput,
  reason: string,
): CreatorStoryAssistantOutput | undefined {
  const kind = inferAssetKind(input);
  if (!kind) return undefined;

  const existing = input.project.assets.find((asset) => asset.kind === kind);
  const prompt = buildPromptForKind(input, kind);
  const output: CreatorStoryAssistantOutput = {
    summary: "已使用本地规则生成可回填的素材提示词草案。",
    suggestions: [
      {
        severity: "warning",
        field: "assistant",
        message: `模型结构化输出不可用，已使用本地素材提示词兜底。${reason}`,
      },
    ],
    patch: {
      assets: [
        {
          id: existing?.id,
          kind,
          title: existing?.title || titleForKind(kind),
          prompt,
          characterId: existing?.characterId,
          notes: existing?.notes || "本地兜底生成的提示词草案，请按作品风格微调后再生图。",
        },
      ],
    },
    patchNotes: [
      {
        field: "assets.prompt",
        before: existing?.prompt,
        after: prompt,
        reason: "模型未返回稳定 JSON 时，为明确的素材提示词任务提供可编辑草案。",
      },
    ],
    nextActions: ["检查提示词是否符合当前故事风格", "确认后回填，再使用生图或上传接口生成图片"],
  };

  return filterCreatorAssistantOutputForSkill(
    output,
    input.targetSection as CreatorStoryAssistantTargetSection | undefined,
  );
}
