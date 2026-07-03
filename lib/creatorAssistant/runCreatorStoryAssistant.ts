import type { ProviderConfig } from "@storyplay/types";
import { chat } from "@/lib/ai-client/chat";
import { hasCreatorStoryAssistantPatch } from "./mergePatch";
import { buildLocalAssetAssistantFallback } from "./localAssetFallback";
import { diagnoseStoryProjectLocally } from "./localDiagnose";
import { buildCreatorStoryAssistantMessages } from "./prompt";
import { fallbackCreatorStoryAssistantOutput, parseCreatorStoryAssistantOutput } from "./parser";
import { filterCreatorAssistantOutputForSkill } from "./skillPatchFilter";
import type { CreatorStoryAssistantInput, CreatorStoryAssistantOutput } from "./types";

export async function runCreatorStoryAssistant(
  config: ProviderConfig,
  input: CreatorStoryAssistantInput,
): Promise<CreatorStoryAssistantOutput> {
  if (input.action === "diagnose") {
    const localResult = filterCreatorAssistantOutputForSkill(
      diagnoseStoryProjectLocally(input.project),
      input.targetSection,
    );
    try {
      const raw = await chat(
        config,
        buildCreatorStoryAssistantMessages(input),
        {
          temperature: 0.4,
          tag: `creator-story-assistant:${input.action}`,
        },
      );
      const modelResult = parseCreatorStoryAssistantOutput(raw, {
        targetSection: input.targetSection,
      });
      return filterCreatorAssistantOutputForSkill({
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
      }, input.targetSection);
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
    const parsed = parseCreatorStoryAssistantOutput(raw, {
      targetSection: input.targetSection,
    });
    if (!hasCreatorStoryAssistantPatch(parsed.patch)) {
      return buildLocalAssetAssistantFallback(input, parsed.suggestions[0]?.message ?? parsed.summary) ?? parsed;
    }
    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : "创作助手调用失败";
    const assetFallback = buildLocalAssetAssistantFallback(input, message);
    if (assetFallback) return assetFallback;
    const localResult = filterCreatorAssistantOutputForSkill(
      diagnoseStoryProjectLocally(input.project),
      input.targetSection,
    );
    return filterCreatorAssistantOutputForSkill({
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
    }, input.targetSection);
  }
}
