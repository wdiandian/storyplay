import type {
  CreatorStoryAssistantAction,
  CreatorStoryAssistantTargetSection,
  StoryProjectPatch,
} from "../types";

export type CreatorAssistantSkill = {
  id: CreatorStoryAssistantTargetSection;
  label: string;
  purpose: string;
  defaultAction: CreatorStoryAssistantAction;
  editableFields: string[];
  readonlyFields: string[];
  patchRootKeys: Array<keyof StoryProjectPatch>;
  promptGuidance: string;
  quickActions: string[];
  outputMode: "diagnose" | "patch" | "proposal";
};

