import type { ProviderConfig } from "@storyplay/types";
import { chat } from "@/lib/ai-client/chat";
import { diagnoseStoryProjectLocally } from "./localDiagnose";
import { buildCreatorStoryAssistantMessages } from "./prompt";
import { fallbackCreatorStoryAssistantOutput, parseCreatorStoryAssistantOutput } from "./parser";
import type { CreatorStoryAssistantInput, CreatorStoryAssistantOutput } from "./types";

export async function runCreatorStoryAssistant(
  config: ProviderConfig,
  input: CreatorStoryAssistantInput,
): Promise<CreatorStoryAssistantOutput> {
  if (input.action === "diagnose") {
    const localResult = diagnoseStoryProjectLocally(input.project);
    try {
      const raw = await chat(
        config,
        buildCreatorStoryAssistantMessages(input),
        {
          temperature: 0.4,
          tag: `creator-story-assistant:${input.action}`,
        },
      );
      const modelResult = parseCreatorStoryAssistantOutput(raw);
      return {
        ...modelResult,
        suggestions: [...localResult.suggestions, ...modelResult.suggestions].slice(0, 10),
        patch: {
          ...localResult.patch,
          ...modelResult.patch,
          interaction: {
            ...localResult.patch.interaction,
            ...modelResult.patch.interaction,
          },
        },
        patchNotes: [...localResult.patchNotes, ...modelResult.patchNotes].slice(0, 10),
        nextActions: [...modelResult.nextActions, ...localResult.nextActions].filter(Boolean).slice(0, 6),
      };
    } catch {
      return localResult;
    }
  }

  try {
    const raw = await chat(
      config,
      buildCreatorStoryAssistantMessages(input),
      {
        temperature: 0.4,
        tag: `creator-story-assistant:${input.action}`,
      },
    );
    return parseCreatorStoryAssistantOutput(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "创作助手调用失败";
    const localResult = diagnoseStoryProjectLocally(input.project);
    return {
      ...fallbackCreatorStoryAssistantOutput(message),
      suggestions: [
        {
          severity: "warning" as const,
          field: "assistant",
          message: message,
        },
        ...localResult.suggestions,
      ].slice(0, 10),
      patch: localResult.patch,
      patchNotes: localResult.patchNotes,
      nextActions: localResult.nextActions,
    };
  }
}
