import type {
  StoryProject,
  StoryProjectAct,
  StoryProjectAudience,
  StoryProjectCharacter,
  StoryProjectLanguage,
  StoryProjectScene,
  StoryProjectStoryOutline,
} from "@/lib/storyProject/types";

export type CreatorStoryAssistantAction =
  | "diagnose"
  | "expand-concept"
  | "build-outline"
  | "create-characters"
  | "improve-playtest";

export type CreatorStoryAssistantInput = {
  action: CreatorStoryAssistantAction;
  project: StoryProject;
  userInstruction?: string;
  selectedActId?: string;
  selectedSceneId?: string;
  playtestId?: string;
  locale: StoryProjectLanguage;
};

export type CreatorStoryAssistantSuggestion = {
  severity: "info" | "warning" | "critical";
  field: string;
  message: string;
};

export type CreatorStoryAssistantPatchNote = {
  field: string;
  before?: string;
  after?: string;
  reason: string;
};

export type CreatorStoryAssistantCharacterPatch =
  Partial<Omit<StoryProjectCharacter, "source">> & {
    source?: "ai-generated";
  };

export type CreatorStoryAssistantScenePatch =
  Partial<Omit<StoryProjectScene, "source" | "lastPlaytest">> & {
    source?: "ai-generated";
  };

export type CreatorStoryAssistantActPatch =
  Partial<Omit<StoryProjectAct, "source" | "scenes">> & {
    scenes?: CreatorStoryAssistantScenePatch[];
    source?: "ai-generated";
  };

export type StoryProjectPatch = {
  title?: string;
  logline?: string;
  synopsis?: string;
  audience?: StoryProjectAudience;
  genres?: string[];
  moods?: string[];
  tags?: string[];
  world?: Partial<StoryProject["world"]>;
  narrative?: Partial<StoryProject["narrative"]>;
  storyOutline?: Partial<StoryProjectStoryOutline>;
  structure?: {
    acts?: CreatorStoryAssistantActPatch[];
    selectedActId?: string;
    selectedSceneId?: string;
  };
  characters?: CreatorStoryAssistantCharacterPatch[];
  interaction?: Partial<StoryProject["interaction"]>;
  visual?: Partial<StoryProject["visual"]>;
  runtimePolicy?: Pick<Partial<StoryProject["runtimePolicy"]>, "orientation" | "styleGuide">;
};

export type CreatorStoryAssistantOutput = {
  summary: string;
  suggestions: CreatorStoryAssistantSuggestion[];
  patch: StoryProjectPatch;
  patchNotes: CreatorStoryAssistantPatchNote[];
  nextActions: string[];
};
