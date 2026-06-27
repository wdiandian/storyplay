import type { ChatMessage } from "@storyplay/ai-client";

export type AgentId =
  | "writer"
  | "style-selector"
  | "character-designer"
  | "cinematographer"
  | "painter"
  | "vision"
  | "freeform-classifier"
  | "insert-beat"
  | "voice";

export type AgentKind = "llm" | "image" | "vision" | "tts" | "pure";

export type ModelRole = "text" | "image" | "vision" | "tts" | "none";

export type AgentSectionOwner =
  | "engineering"
  | "narrative-design"
  | "system";

export type AgentSectionRisk = "low" | "medium" | "high" | "protocol";

export type AgentRuleSeverity = "advisory" | "required" | "hard";

export type AgentRule = {
  id: string;
  text: string;
  severity: AgentRuleSeverity;
};

export type AgentSkillSection = {
  id: string;
  title: string;
  content: string;
  owner: AgentSectionOwner;
  risk: AgentSectionRisk;
};

export type AgentSkill = {
  id: string;
  agentId: AgentId;
  version: string;
  name: string;
  role: string;
  goal: string;
  inputs: string[];
  outputs: string;
  rules: AgentRule[];
  mustNot: AgentRule[];
  strategySections: AgentSkillSection[];
  protocolSections: AgentSkillSection[];
};

export type SchemaDescriptor = {
  name: string;
  description: string;
};

export type AgentContract<TInput = unknown, TOutput = unknown> = {
  id: AgentId;
  name: string;
  kind: AgentKind;
  modelRole: ModelRole;
  inputSchema: SchemaDescriptor;
  outputSchema: SchemaDescriptor;
  skill: AgentSkill;
  buildMessages?: (input: TInput) => ChatMessage[];
  buildPrompt?: (input: TInput) => string;
  parseOutput?: (raw: string, input: TInput) => TOutput;
  fallback?: (input: TInput, error: unknown) => TOutput | Promise<TOutput>;
};

export type AnyAgentContract = AgentContract<any, unknown>;

export type AgentRegistryEntry = {
  id: AgentId;
  name: string;
  kind: AgentKind;
  modelRole: ModelRole;
  skill: AgentSkill;
  contract: AnyAgentContract;
};

export type AgentInventoryItem = {
  id: AgentId;
  name: string;
  kind: AgentKind;
  modelRole: ModelRole;
  version: string;
  goal: string;
};
