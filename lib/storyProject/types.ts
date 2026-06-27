export type StoryProjectAudience = "male" | "female" | "universal";
export type StoryProjectStatus = "draft" | "playtest" | "published" | "archived";
export type StoryProjectLanguage = "zh-CN" | "en" | "ja";
export type StoryProjectSource = "manual" | "ai-generated" | "imported" | "playtest";
export type StoryProjectGenerationStatus = "idle" | "generating" | "ready" | "failed";
export type StoryProjectPlaytestStatus = "created" | "started" | "completed" | "discarded";
export type StoryProjectOpeningStatus = "empty" | "draft" | "ready";

export type StoryProjectScenePlaytestResult = {
  playtestId: string;
  status: StoryProjectPlaytestStatus;
  updatedAt: string;
  sessionId: string;
  summary: string;
  firstSceneId: string;
  firstSceneKey: string;
  firstSceneImageUrl: string;
  sceneCount: number;
  characterCount: number;
};

export type StoryProjectScene = {
  id: string;
  title: string;
  location: string;
  characters: string[];
  purpose: string;
  openingEvent: string;
  playerChoices: string[];
  emotionalBeat: string;
  notes: string;
  lastPlaytest: StoryProjectScenePlaytestResult;
  source: StoryProjectSource;
};

export type StoryProjectAct = {
  id: string;
  title: string;
  goal: string;
  conflict: string;
  pacing: string;
  notes: string;
  scenes: StoryProjectScene[];
  source: StoryProjectSource;
};

export type StoryProjectPlaytestRecord = {
  id: string;
  status: StoryProjectPlaytestStatus;
  createdAt: string;
  updatedAt: string;
  sourceProjectUpdatedAt: string;
  sourceActId: string;
  sourceSceneId: string;
  startRequest: {
    worldSetting: string;
    styleGuide: string;
    orientation?: "portrait" | "landscape";
    language?: string;
  };
  warnings: Array<{
    field: string;
    message: string;
  }>;
  sessionId: string;
  summary: string;
  firstSceneId: string;
  firstSceneKey: string;
  firstSceneImageUrl: string;
  sceneCount: number;
  characterCount: number;
  notes: string;
};

export type StoryProjectCharacter = {
  id: string;
  name: string;
  role: "protagonist" | "main" | "supporting" | "temporary";
  persona: string;
  relationshipToPlayer: string;
  visualNotes: string;
  voiceNotes: string;
  source: StoryProjectSource;
  locked: boolean;
};

export type StoryProjectOpeningChoice = {
  id: string;
  label: string;
  effect:
    | { kind: "advance-beat"; targetBeatId: string }
    | { kind: "change-scene"; nextSceneSeed: string };
};

export type StoryProjectOpeningBeat = {
  id: string;
  kind: "narration" | "dialogue";
  narration: string;
  speaker: string;
  line: string;
  lineDelivery: string;
  activeCharacters: Array<{
    name: string;
    pose: string;
  }>;
  next:
    | { type: "continue"; nextBeatId: string }
    | { type: "choice"; choices: StoryProjectOpeningChoice[] };
  locked: boolean;
};

export type StoryProjectOpeningScene = {
  id: string;
  title: string;
  location: string;
  sceneKey: string;
  scenePrompt: string;
  orientation: "portrait" | "landscape";
  backgroundImageUrl: string;
  backgroundImageUuid: string;
  beats: StoryProjectOpeningBeat[];
  entryBeatId: string;
};

export type StoryProjectOpeningStoryState = {
  logline: string;
  genreTags: string;
  protagonist: string;
  castNotes: string;
  synopsis: string;
  openThreads: string[];
  relationships: string[];
  nextHook: string;
};

export type StoryProjectOpeningPackage = {
  id: string;
  status: StoryProjectOpeningStatus;
  source: StoryProjectSource;
  updatedAt: string;
  scene: StoryProjectOpeningScene;
  storyState: StoryProjectOpeningStoryState;
};

export type StoryProjectStoryOutline = {
  mainGoal: string;
  phaseOutline: string;
  requiredBeats: string[];
  relationshipArc: string;
  endingDirection: string;
  guardrails: string[];
};

export type StoryProject = {
  schemaVersion: 1;
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  language: StoryProjectLanguage;
  audience: StoryProjectAudience;
  genres: string[];
  moods: string[];
  tags: string[];
  world: {
    setting: string;
    rules: string;
    tone: string;
    locations: string;
  };
  narrative: {
    protagonist: string;
    coreConflict: string;
    keyMysteries: string[];
    chapterGoals: string;
    creatorNotes: string;
  };
  storyOutline: StoryProjectStoryOutline;
  structure: {
    acts: StoryProjectAct[];
    selectedActId: string;
    selectedSceneId: string;
  };
  characters: StoryProjectCharacter[];
  openingPackage: StoryProjectOpeningPackage;
  interaction: {
    intensity: "light" | "medium" | "strong";
    choiceStyle: string;
    branchNotes: string;
    freeformInput: boolean;
  };
  visual: {
    stylePrompt: string;
    cover: string;
    firstScene: string;
  };
  runtimePolicy: {
    orientation: "portrait" | "landscape";
    styleGuide: string;
    ttsEnabled: boolean;
    prefetchDepth: 0 | 1 | 2;
  };
  generation: {
    status: StoryProjectGenerationStatus;
    firstActPath: string;
    lastGeneratedAt: string;
    message: string;
  };
  publish: {
    status: Extract<StoryProjectStatus, "draft" | "playtest" | "published">;
    skuId: string;
  };
  playtests: StoryProjectPlaytestRecord[];
  createdAt: string;
  updatedAt: string;
};

export type StoryProjectCreateInput = {
  title?: string;
  logline?: string;
  synopsis?: string;
  language?: StoryProjectLanguage;
  audience?: StoryProjectAudience;
  genres?: string[];
  moods?: string[];
  tags?: string[];
  world?: Partial<StoryProject["world"]>;
  narrative?: Partial<StoryProject["narrative"]>;
  storyOutline?: Partial<StoryProjectStoryOutline>;
  interaction?: Partial<StoryProject["interaction"]>;
  visual?: Partial<StoryProject["visual"]>;
};

export type StoryProjectValidationIssue = {
  field: string;
  message: string;
};

const projectIdPrefix = "sp_project";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function sanitizeStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createStoryProjectId() {
  return createId(projectIdPrefix);
}

export function createStoryProjectPlaytestId() {
  return createId("sp_playtest");
}

export function createStoryProjectCharacter(
  input: Partial<StoryProjectCharacter> = {},
): StoryProjectCharacter {
  return {
    id: input.id ?? createId("sp_char"),
    name: sanitizeString(input.name),
    role: input.role ?? "main",
    persona: sanitizeString(input.persona),
    relationshipToPlayer: sanitizeString(input.relationshipToPlayer),
    visualNotes: sanitizeString(input.visualNotes),
    voiceNotes: sanitizeString(input.voiceNotes),
    source: input.source ?? "manual",
    locked: Boolean(input.locked),
  };
}

function createOpeningBeatId() {
  return createId("sp_beat");
}

function sanitizeOpeningChoice(choice: Partial<StoryProjectOpeningChoice> = {}): StoryProjectOpeningChoice {
  const id = sanitizeString(choice.id, createId("sp_choice"));
  const label = sanitizeString(choice.label, "继续");
  const effect = choice.effect?.kind === "advance-beat"
    ? {
        kind: "advance-beat" as const,
        targetBeatId: sanitizeString(choice.effect.targetBeatId),
      }
    : {
        kind: "change-scene" as const,
        nextSceneSeed: sanitizeString(
          choice.effect?.kind === "change-scene" ? choice.effect.nextSceneSeed : "",
          "故事继续推进",
        ),
      };
  return { id, label, effect };
}

function createStoryProjectOpeningBeat(
  input: Partial<StoryProjectOpeningBeat> = {},
): StoryProjectOpeningBeat {
  const activeCharacters = Array.isArray(input.activeCharacters)
    ? input.activeCharacters
        .map((character) => ({
          name: sanitizeString(character.name),
          pose: sanitizeString(character.pose),
        }))
        .filter((character) => character.name)
    : [];
  const next = input.next?.type === "continue"
    ? {
        type: "continue" as const,
        nextBeatId: sanitizeString(input.next.nextBeatId),
      }
    : {
        type: "choice" as const,
        choices: Array.isArray(input.next?.choices) && input.next.choices.length > 0
          ? input.next.choices.map((choice) => sanitizeOpeningChoice(choice))
          : [
              sanitizeOpeningChoice({
                id: "exit",
                label: "继续",
                effect: { kind: "change-scene", nextSceneSeed: "故事继续推进" },
              }),
            ],
      };

  return {
    id: sanitizeString(input.id, createOpeningBeatId()),
    kind: input.kind === "dialogue" ? "dialogue" : "narration",
    narration: sanitizeString(input.narration),
    speaker: sanitizeString(input.speaker),
    line: sanitizeString(input.line),
    lineDelivery: sanitizeString(input.lineDelivery),
    activeCharacters,
    next,
    locked: input.locked ?? true,
  };
}

export function createStoryProjectOpeningPackage(
  input: Partial<StoryProjectOpeningPackage> = {},
): StoryProjectOpeningPackage {
  const firstBeat = createStoryProjectOpeningBeat({
    id: "b1",
    narration: "故事从这里开始。",
    next: {
      type: "choice",
      choices: [
        {
          id: "exit",
          label: "继续",
          effect: { kind: "change-scene", nextSceneSeed: "故事继续推进" },
        },
      ],
    },
  });
  const inputScene: Partial<StoryProjectOpeningScene> = input.scene ?? {};
  const beats = Array.isArray(inputScene.beats) && inputScene.beats.length > 0
    ? inputScene.beats.map((beat) => createStoryProjectOpeningBeat(beat))
    : [firstBeat];
  const entryBeatId = beats.some((beat) => beat.id === inputScene.entryBeatId)
    ? sanitizeString(inputScene.entryBeatId)
    : beats[0]!.id;

  return {
    id: sanitizeString(input.id, createId("sp_opening")),
    status: input.status ?? "empty",
    source: input.source ?? "manual",
    updatedAt: sanitizeString(input.updatedAt),
    scene: {
      id: sanitizeString(inputScene.id, createId("sp_opening_scene")),
      title: sanitizeString(inputScene.title, "首场"),
      location: sanitizeString(inputScene.location),
      sceneKey: sanitizeString(inputScene.sceneKey),
      scenePrompt: sanitizeString(inputScene.scenePrompt),
      orientation: inputScene.orientation === "landscape" ? "landscape" : "portrait",
      backgroundImageUrl: sanitizeString(inputScene.backgroundImageUrl),
      backgroundImageUuid: sanitizeString(inputScene.backgroundImageUuid),
      beats,
      entryBeatId,
    },
    storyState: {
      logline: sanitizeString(input.storyState?.logline),
      genreTags: sanitizeString(input.storyState?.genreTags),
      protagonist: sanitizeString(input.storyState?.protagonist),
      castNotes: sanitizeString(input.storyState?.castNotes),
      synopsis: sanitizeString(input.storyState?.synopsis),
      openThreads: sanitizeStringArray(input.storyState?.openThreads),
      relationships: sanitizeStringArray(input.storyState?.relationships),
      nextHook: sanitizeString(input.storyState?.nextHook),
    },
  };
}

export function createStoryProjectStoryOutline(
  input: Partial<StoryProjectStoryOutline> = {},
): StoryProjectStoryOutline {
  return {
    mainGoal: sanitizeString(input.mainGoal),
    phaseOutline: sanitizeString(input.phaseOutline),
    requiredBeats: sanitizeStringArray(input.requiredBeats),
    relationshipArc: sanitizeString(input.relationshipArc),
    endingDirection: sanitizeString(input.endingDirection),
    guardrails: sanitizeStringArray(input.guardrails),
  };
}

export function createStoryProjectScene(input: Partial<StoryProjectScene> = {}): StoryProjectScene {
  return {
    id: input.id ?? createId("sp_scene_plan"),
    title: sanitizeString(input.title, "第一场"),
    location: sanitizeString(input.location),
    characters: sanitizeStringArray(input.characters),
    purpose: sanitizeString(input.purpose),
    openingEvent: sanitizeString(input.openingEvent),
    playerChoices: sanitizeStringArray(input.playerChoices),
    emotionalBeat: sanitizeString(input.emotionalBeat),
    notes: sanitizeString(input.notes),
    lastPlaytest: normalizeScenePlaytestResult(input.lastPlaytest),
    source: input.source ?? "manual",
  };
}

function normalizeScenePlaytestResult(
  result: Partial<StoryProjectScenePlaytestResult> | undefined,
): StoryProjectScenePlaytestResult {
  return {
    playtestId: sanitizeString(result?.playtestId),
    status: result?.status ?? "created",
    updatedAt: sanitizeString(result?.updatedAt),
    sessionId: sanitizeString(result?.sessionId),
    summary: sanitizeString(result?.summary),
    firstSceneId: sanitizeString(result?.firstSceneId),
    firstSceneKey: sanitizeString(result?.firstSceneKey),
    firstSceneImageUrl: sanitizeString(result?.firstSceneImageUrl),
    sceneCount: Number.isFinite(result?.sceneCount) ? Math.max(0, Math.floor(result!.sceneCount!)) : 0,
    characterCount: Number.isFinite(result?.characterCount) ? Math.max(0, Math.floor(result!.characterCount!)) : 0,
  };
}

export function createStoryProjectAct(input: Partial<StoryProjectAct> = {}): StoryProjectAct {
  return {
    id: input.id ?? createId("sp_act"),
    title: sanitizeString(input.title, "第一幕"),
    goal: sanitizeString(input.goal),
    conflict: sanitizeString(input.conflict),
    pacing: sanitizeString(input.pacing),
    notes: sanitizeString(input.notes),
    scenes: Array.isArray(input.scenes) && input.scenes.length > 0
      ? input.scenes.map((scene) => createStoryProjectScene(scene))
      : [createStoryProjectScene()],
    source: input.source ?? "manual",
  };
}

export function createStoryProject(input: StoryProjectCreateInput = {}): StoryProject {
  const now = new Date().toISOString();
  const title = sanitizeString(input.title, "未命名故事工程");

  return {
    schemaVersion: 1,
    id: createStoryProjectId(),
    title,
    logline: sanitizeString(input.logline),
    synopsis: sanitizeString(input.synopsis),
    language: input.language ?? "zh-CN",
    audience: input.audience ?? "universal",
    genres: sanitizeStringArray(input.genres),
    moods: sanitizeStringArray(input.moods),
    tags: sanitizeStringArray(input.tags),
    world: {
      setting: sanitizeString(input.world?.setting),
      rules: sanitizeString(input.world?.rules),
      tone: sanitizeString(input.world?.tone),
      locations: sanitizeString(input.world?.locations),
    },
    narrative: {
      protagonist: sanitizeString(input.narrative?.protagonist),
      coreConflict: sanitizeString(input.narrative?.coreConflict),
      keyMysteries: sanitizeStringArray(input.narrative?.keyMysteries),
      chapterGoals: sanitizeString(input.narrative?.chapterGoals),
      creatorNotes: sanitizeString(input.narrative?.creatorNotes),
    },
    storyOutline: createStoryProjectStoryOutline(input.storyOutline),
    structure: (() => {
      const firstAct = createStoryProjectAct();
      const firstScene = firstAct.scenes[0]!;
      return {
        acts: [firstAct],
        selectedActId: firstAct.id,
        selectedSceneId: firstScene.id,
      };
    })(),
    characters: [],
    openingPackage: createStoryProjectOpeningPackage(),
    interaction: {
      intensity: input.interaction?.intensity ?? "medium",
      choiceStyle: sanitizeString(input.interaction?.choiceStyle, "关键选择推动故事"),
      branchNotes: sanitizeString(input.interaction?.branchNotes),
      freeformInput: input.interaction?.freeformInput ?? true,
    },
    visual: {
      stylePrompt: sanitizeString(input.visual?.stylePrompt),
      cover: sanitizeString(input.visual?.cover),
      firstScene: sanitizeString(input.visual?.firstScene),
    },
    runtimePolicy: {
      orientation: "portrait",
      styleGuide: sanitizeString(input.visual?.stylePrompt),
      ttsEnabled: false,
      prefetchDepth: 0,
    },
    generation: {
      status: "idle",
      firstActPath: "",
      lastGeneratedAt: "",
      message: "",
    },
    publish: {
      status: "draft",
      skuId: "",
    },
    playtests: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizePlaytestRecord(record: StoryProjectPlaytestRecord): StoryProjectPlaytestRecord {
  const now = new Date().toISOString();
  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id : createStoryProjectPlaytestId(),
    status: record.status ?? "created",
    createdAt: isNonEmptyString(record.createdAt) ? record.createdAt : now,
    updatedAt: isNonEmptyString(record.updatedAt) ? record.updatedAt : now,
    sourceProjectUpdatedAt: sanitizeString(record.sourceProjectUpdatedAt),
    sourceActId: sanitizeString(record.sourceActId),
    sourceSceneId: sanitizeString(record.sourceSceneId),
    startRequest: {
      worldSetting: sanitizeString(record.startRequest?.worldSetting),
      styleGuide: sanitizeString(record.startRequest?.styleGuide),
      orientation: record.startRequest?.orientation,
      language: sanitizeString(record.startRequest?.language) || undefined,
    },
    warnings: Array.isArray(record.warnings)
      ? record.warnings.map((warning) => ({
          field: sanitizeString(warning.field),
          message: sanitizeString(warning.message),
        }))
      : [],
    sessionId: sanitizeString(record.sessionId),
    summary: sanitizeString(record.summary),
    firstSceneId: sanitizeString(record.firstSceneId),
    firstSceneKey: sanitizeString(record.firstSceneKey),
    firstSceneImageUrl: sanitizeString(record.firstSceneImageUrl),
    sceneCount: Number.isFinite(record.sceneCount) ? Math.max(0, Math.floor(record.sceneCount)) : 0,
    characterCount: Number.isFinite(record.characterCount) ? Math.max(0, Math.floor(record.characterCount)) : 0,
    notes: sanitizeString(record.notes),
  };
}

export function normalizeStoryProject(
  project: StoryProject,
  options: { touchUpdatedAt?: boolean } = {},
): StoryProject {
  const now = new Date().toISOString();
  return {
    ...createStoryProject(project),
    ...project,
    schemaVersion: 1,
    title: sanitizeString(project.title, "未命名故事工程"),
    logline: sanitizeString(project.logline),
    synopsis: sanitizeString(project.synopsis),
    genres: sanitizeStringArray(project.genres),
    moods: sanitizeStringArray(project.moods),
    tags: sanitizeStringArray(project.tags),
    world: {
      setting: sanitizeString(project.world?.setting),
      rules: sanitizeString(project.world?.rules),
      tone: sanitizeString(project.world?.tone),
      locations: sanitizeString(project.world?.locations),
    },
    narrative: {
      protagonist: sanitizeString(project.narrative?.protagonist),
      coreConflict: sanitizeString(project.narrative?.coreConflict),
      keyMysteries: sanitizeStringArray(project.narrative?.keyMysteries),
      chapterGoals: sanitizeString(project.narrative?.chapterGoals),
      creatorNotes: sanitizeString(project.narrative?.creatorNotes),
    },
    storyOutline: createStoryProjectStoryOutline({
      mainGoal: project.storyOutline?.mainGoal ?? project.narrative?.chapterGoals,
      phaseOutline: project.storyOutline?.phaseOutline,
      requiredBeats: project.storyOutline?.requiredBeats ?? project.narrative?.keyMysteries,
      relationshipArc: project.storyOutline?.relationshipArc,
      endingDirection: project.storyOutline?.endingDirection,
      guardrails: project.storyOutline?.guardrails,
    }),
    characters: Array.isArray(project.characters)
      ? project.characters.map((character) => createStoryProjectCharacter(character))
      : [],
    openingPackage: createStoryProjectOpeningPackage(project.openingPackage),
    structure: (() => {
      const acts = Array.isArray(project.structure?.acts) && project.structure.acts.length > 0
        ? project.structure.acts.map((act) => createStoryProjectAct(act))
        : [createStoryProjectAct()];
      const fallbackAct = acts[0]!;
      const selectedAct = acts.find((act) => act.id === project.structure?.selectedActId) ?? fallbackAct;
      const fallbackScene = selectedAct.scenes[0] ?? fallbackAct.scenes[0]!;
      const selectedScene =
        selectedAct.scenes.find((scene) => scene.id === project.structure?.selectedSceneId) ??
        fallbackScene;
      return {
        acts,
        selectedActId: selectedAct.id,
        selectedSceneId: selectedScene.id,
      };
    })(),
    interaction: {
      intensity: project.interaction?.intensity ?? "medium",
      choiceStyle: sanitizeString(project.interaction?.choiceStyle, "关键选择推动故事"),
      branchNotes: sanitizeString(project.interaction?.branchNotes),
      freeformInput: project.interaction?.freeformInput ?? true,
    },
    visual: {
      stylePrompt: sanitizeString(project.visual?.stylePrompt),
      cover: sanitizeString(project.visual?.cover),
      firstScene: sanitizeString(project.visual?.firstScene),
    },
    runtimePolicy: {
      orientation: project.runtimePolicy?.orientation ?? "portrait",
      styleGuide: sanitizeString(project.runtimePolicy?.styleGuide, project.visual?.stylePrompt),
      ttsEnabled: Boolean(project.runtimePolicy?.ttsEnabled),
      prefetchDepth: project.runtimePolicy?.prefetchDepth ?? 0,
    },
    generation: {
      status: project.generation?.status ?? "idle",
      firstActPath: sanitizeString(project.generation?.firstActPath),
      lastGeneratedAt: sanitizeString(project.generation?.lastGeneratedAt),
      message: sanitizeString(project.generation?.message),
    },
    publish: {
      status: project.publish?.status ?? "draft",
      skuId: sanitizeString(project.publish?.skuId),
    },
    playtests: Array.isArray(project.playtests)
      ? project.playtests.map((record) => normalizePlaytestRecord(record))
      : [],
    createdAt: isNonEmptyString(project.createdAt) ? project.createdAt : now,
    updatedAt:
      options.touchUpdatedAt || !isNonEmptyString(project.updatedAt)
        ? now
        : project.updatedAt,
  };
}

export function validateStoryProject(project: StoryProject): StoryProjectValidationIssue[] {
  const issues: StoryProjectValidationIssue[] = [];

  if (!isNonEmptyString(project.id)) {
    issues.push({ field: "id", message: "缺少工程 ID" });
  }
  if (!isNonEmptyString(project.title)) {
    issues.push({ field: "title", message: "请输入故事工程标题" });
  }
  if (!isNonEmptyString(project.logline) && !isNonEmptyString(project.synopsis)) {
    issues.push({ field: "logline", message: "至少补充一句话概念或故事简介" });
  }

  return issues;
}
