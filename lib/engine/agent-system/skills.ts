import type { AgentId, AgentRule, AgentSkill, AgentSkillSection } from "./types";

function rule(id: string, text: string, severity: AgentRule["severity"] = "required"): AgentRule {
  return { id, text, severity };
}

function strategy(id: string, title: string, content: string): AgentSkillSection {
  return {
    id,
    title,
    content,
    owner: "narrative-design",
    risk: "medium",
  };
}

function protocol(id: string, title: string, content: string): AgentSkillSection {
  return {
    id,
    title,
    content,
    owner: "system",
    risk: "protocol",
  };
}

function makeSkill(input: {
  agentId: AgentId;
  version: string;
  name: string;
  role: string;
  goal: string;
  inputs: string[];
  outputs: string;
  rules: AgentRule[];
  mustNot: AgentRule[];
  strategySections?: AgentSkillSection[];
  protocolSections?: AgentSkillSection[];
}): AgentSkill {
  return {
    id: `${input.agentId}.skill.${input.version}`,
    strategySections: [],
    protocolSections: [],
    ...input,
  };
}

export const writerSkill = makeSkill({
  agentId: "writer",
  version: "v1",
  name: "Writer",
  role: "互动视觉小说主编剧和实时导演。",
  goal: "根据 Session 生成下一幕可播放故事，输出 plan、story、choices，并更新故事记忆。",
  inputs: [
    "worldSetting",
    "styleGuide",
    "history",
    "characters",
    "storyState",
    "playerName",
    "language",
  ],
  outputs: "<plan> JSON, <story> prose, <choices> JSON",
  rules: [
    rule("writer-three-tags", "必须按 <plan> -> <story> -> <choices> 三段输出。", "hard"),
    rule("writer-pov", "玩家永远是第二人称“你”，不可进入 cast 或 entryActiveCharacters。", "hard"),
    rule("writer-memory", "每幕必须通过 memory 更新动态故事状态。"),
  ],
  mustNot: [
    rule("writer-no-extra-text", "不得输出三段标签之外的文本。", "hard"),
    rule("writer-no-advance-beat", "不得在 choices 中使用 advance-beat。", "hard"),
    rule("writer-no-meta", "不得让角色知道创作者、设定、用户等元概念。", "hard"),
  ],
  strategySections: [
    strategy("writer-style", "文风策略", "控制视觉小说正文的文风、节奏、对白质感和感官描写。"),
    strategy("writer-pacing", "节奏策略", "控制每幕自然暂停、避免强收束、承接上一幕情绪。"),
  ],
  protocolSections: [
    protocol("writer-output-protocol", "输出协议", "三段标签、plan/choices/memory JSON 结构和 POV 规则。"),
    protocol("writer-story-state-protocol", "故事记忆协议", "storyBible 仅开局生成，storyState 动态字段每幕更新。"),
  ],
});

export const styleSelectorSkill = makeSkill({
  agentId: "style-selector",
  version: "v1",
  name: "StyleSelector",
  role: "视觉小说美术指导。",
  goal: "根据故事命题从内置画风列表中选择最匹配的一个画风。",
  inputs: ["worldSetting", "STYLE_MAP style names"],
  outputs: "A single style name that maps to STYLE_MAP.",
  rules: [
    rule("style-match-existing", "输出必须匹配内置画风名。", "hard"),
    rule("style-default", "不确定时默认吉卜力。"),
  ],
  mustNot: [
    rule("style-no-explanation", "不得解释理由。", "hard"),
    rule("style-no-new-style", "不得自创画风名。", "hard"),
  ],
  strategySections: [
    strategy("style-selection-policy", "画风选择策略", "根据题材、情绪、时代、受众匹配画风。"),
  ],
  protocolSections: [
    protocol("style-output-protocol", "输出协议", "只输出一个内置画风名。"),
  ],
});

export const characterDesignerSkill = makeSkill({
  agentId: "character-designer",
  version: "v1",
  name: "CharacterDesigner",
  role: "角色设定师和媒体翻译官。",
  goal: "把角色名和角色意图转成视觉卡、音色卡、肖像和可合成声音。",
  inputs: [
    "character name",
    "worldSetting",
    "styleGuide",
    "characterIntents",
    "existing characters",
    "tts provider",
  ],
  outputs: "Character visualDescription, voiceDescription, optional stepfunVoiceId, portrait, voice.",
  rules: [
    rule("character-same-person", "视觉卡和音色卡必须描述同一个人。", "hard"),
    rule("character-differentiate", "新角色必须与已有角色形成明显视觉差异。"),
    rule("character-voice-gender", "voiceDescription 必须以明确性别开头。", "hard"),
  ],
  mustNot: [
    rule("character-no-conflict", "不得发明与 Writer 意图冲突的人设。", "hard"),
    rule("character-no-scene", "视觉卡不得写背景环境或瞬时姿势。"),
    rule("character-no-extra-text", "文本卡阶段不得输出 JSON 以外文本。", "hard"),
  ],
  strategySections: [
    strategy("character-visual-policy", "角色视觉策略", "发色、瞳色、剪影、服饰、识别点和气质差异化。"),
    strategy("character-voice-policy", "角色音色策略", "年龄、性别、音色质感、语速和人设腔调。"),
  ],
  protocolSections: [
    protocol("character-output-protocol", "输出协议", "visualDescription、voiceDescription、stepfunVoiceId 的结构。"),
    protocol("character-provider-protocol", "供应商协议", "StepFun 预设音色与 Xiaomi voice design 的路径差异。"),
  ],
});

export const cinematographerSkill = makeSkill({
  agentId: "cinematographer",
  version: "v1",
  name: "Cinematographer",
  role: "视觉小说分镜导演。",
  goal: "把 Writer 的中文场景概要转为英文构图 prompt。",
  inputs: [
    "sceneSummary",
    "styleGuide",
    "entryBeatActiveCharacters",
    "entryBeatSpeaker",
    "priorSceneKey",
    "currentSceneKey",
  ],
  outputs: "JSON with shotType and integratedPrompt.",
  rules: [
    rule("cine-english", "integratedPrompt 必须为英文。", "hard"),
    rule("cine-no-appearance", "不负责角色外貌，只描述位置、姿态、环境和镜头。", "hard"),
    rule("cine-continuity", "sceneKey 相同时强调空间连续性。"),
  ],
  mustNot: [
    rule("cine-no-ui", "不得描述 UI、字幕、对话框或按钮。", "hard"),
    rule("cine-no-player-body", "不得画出玩家身体部位。", "hard"),
    rule("cine-no-extra-text", "不得输出 JSON 以外文本。", "hard"),
  ],
  strategySections: [
    strategy("cine-camera-policy", "镜头策略", "根据 speaker 和在场角色选择 close-up、medium shot 或 wide shot。"),
  ],
  protocolSections: [
    protocol("cine-output-protocol", "输出协议", "shotType 与 integratedPrompt JSON 结构。"),
    protocol("cine-pov-protocol", "POV 协议", "玩家是不可见镜头位置，NPC 可看向镜头外。"),
  ],
});

export const painterSkill = makeSkill({
  agentId: "painter",
  version: "v1",
  name: "Painter",
  role: "最终图像生成器。",
  goal: "合并画风、分镜、角色视觉卡和参考图，生成当前 Scene 背景图。",
  inputs: [
    "integratedPrompt",
    "styleGuide",
    "onStageCharacters",
    "orientation",
    "styleReferenceImage",
    "priorSceneImage",
    "character portraits",
  ],
  outputs: "imageUrl and imageUuid.",
  rules: [
    rule("painter-reference-priority", "按风格参考、上一幕场景、说话角色肖像、其他角色肖像收集参考图。"),
    rule("painter-frame", "横屏 16:9，竖屏 9:16。"),
    rule("painter-ui-space", "底部 35% 保持相对简洁以叠加 UI。"),
  ],
  mustNot: [
    rule("painter-no-text", "不得生成中英文文字。", "hard"),
    rule("painter-no-ui", "不得生成对话框、按钮、菜单或 HUD。", "hard"),
    rule("painter-no-player-body", "不得出现玩家身体部位。", "hard"),
  ],
  strategySections: [
    strategy("painter-composition-policy", "构图策略", "控制画面留白、角色区域和关键元素位置。"),
  ],
  protocolSections: [
    protocol("painter-image-protocol", "图像协议", "image provider 调用、referenceImages 上限和 fallback。"),
  ],
});

export const visionSkill = makeSkill({
  agentId: "vision",
  version: "v1",
  name: "Vision",
  role: "背景点击视觉理解助手。",
  goal: "理解玩家点击的红点位置，判断玩家意图和是否需要切换场景。",
  inputs: ["annotated image", "current scenePrompt"],
  outputs: "freeformAction, classify, reasoning.",
  rules: [
    rule("vision-insert", "点击当前物件、角色或细节通常是 insert-beat。"),
    rule("vision-change", "点击门、走廊、远处空间或时间跳跃物件通常是 change-scene。"),
  ],
  mustNot: [
    rule("vision-no-extra-text", "不得输出 JSON 以外文本。", "hard"),
  ],
  strategySections: [
    strategy("vision-classify-policy", "点击分类策略", "根据红点对象和场景语义判断探索或推进。"),
  ],
  protocolSections: [
    protocol("vision-output-protocol", "输出协议", "classify 只能是 insert-beat 或 change-scene。"),
  ],
});

export const freeformClassifierSkill = makeSkill({
  agentId: "freeform-classifier",
  version: "v1",
  name: "FreeformClassifier",
  role: "自由输入意图分类助手。",
  goal: "判断玩家自由输入是场内互动还是推动到新场景。",
  inputs: ["freeformText", "current scenePrompt"],
  outputs: "classify and freeformAction.",
  rules: [
    rule("freeform-dialogue-insert", "问问题、说话、调查当前物件通常是 insert-beat。"),
    rule("freeform-decision-change", "离开、去新地点、重大决定、时间跳跃通常是 change-scene。"),
    rule("freeform-default-insert", "拿不准时偏向 insert-beat。"),
  ],
  mustNot: [
    rule("freeform-no-extra-text", "不得输出 JSON 以外文本。", "hard"),
  ],
  strategySections: [
    strategy("freeform-classify-policy", "自由输入分类策略", "低成本互动优先，重大推进才换场。"),
  ],
  protocolSections: [
    protocol("freeform-output-protocol", "输出协议", "classify 只能是 insert-beat 或 change-scene。"),
  ],
});

export const insertBeatSkill = makeSkill({
  agentId: "insert-beat",
  version: "v1",
  name: "InsertBeat",
  role: "场内即时反馈编剧。",
  goal: "针对玩家当前画面内动作生成一个临时 beat，不换图、不换场景。",
  inputs: ["session", "freeformAction"],
  outputs: "Partial beat JSON with narration, speaker, line, lineDelivery.",
  rules: [
    rule("insert-response", "玩家动作必须得到有实质内容的回应。", "hard"),
    rule("insert-npc-response", "有 NPC 在场时优先让在场 NPC 回应。"),
    rule("insert-speaker", "speaker 只能是已登记 NPC 名或“你”。", "hard"),
  ],
  mustNot: [
    rule("insert-no-new-character", "不得引入新角色。", "hard"),
    rule("insert-no-scene-change", "不得换图、换场景或生成选项。", "hard"),
    rule("insert-no-extra-text", "不得输出 JSON 以外文本。", "hard"),
  ],
  strategySections: [
    strategy("insert-feedback-policy", "场内反馈策略", "用观察、潜台词或 NPC 反应给玩家动作反馈。"),
  ],
  protocolSections: [
    protocol("insert-output-protocol", "输出协议", "Partial beat 字段和 speaker 白名单。"),
  ],
});

export const voiceSkill = makeSkill({
  agentId: "voice",
  version: "v1",
  name: "Voice / TTS",
  role: "对白语音执行器。",
  goal: "为 NPC 对白准备音色并合成逐 beat 音频。",
  inputs: ["beat.line", "lineDelivery", "voice", "voiceDescription", "stepfunVoiceId"],
  outputs: "audio base64 and mime, or audio null.",
  rules: [
    rule("voice-npc-only", "只有 NPC 对白需要配音，玩家“你”和内心独白不配音。", "hard"),
    rule("voice-provider-normalize", "合成前需要规范化 Xiaomi / StepFun provider 差异。"),
    rule("voice-silent-fallback", "失败或超时返回静音，不阻塞故事。", "hard"),
  ],
  mustNot: [
    rule("voice-no-block", "不得因单句语音失败阻塞主流程。", "hard"),
  ],
  strategySections: [
    strategy("voice-performance-policy", "表演策略", "lineDelivery 只作为配音导演指令，不读出。"),
  ],
  protocolSections: [
    protocol("voice-provider-protocol", "TTS 协议", "Xiaomi voicedesign/voiceclone 与 StepFun preset speech。"),
  ],
});

export const AGENT_SKILLS = [
  writerSkill,
  styleSelectorSkill,
  characterDesignerSkill,
  cinematographerSkill,
  painterSkill,
  visionSkill,
  freeformClassifierSkill,
  insertBeatSkill,
  voiceSkill,
] as const satisfies readonly AgentSkill[];
