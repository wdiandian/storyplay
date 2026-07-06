import type { ChatMessage } from "@/lib/ai-client/chat";
import type {
  CreatorStoryAssistantAction,
  CreatorStoryAssistantInput,
} from "./types";
import { getCreatorAssistantSkill } from "./skills/registry";

const actionGuidance: Record<CreatorStoryAssistantAction, string> = {
  diagnose:
    "Audit the project for missing creative inputs, weak continuity, playtest risks, and fields that need creator attention. Prefer suggestions over patch changes.",
  "expand-concept":
    "Strengthen the concept, world, genre tags, tone, protagonist position, conflict, mysteries, and visual direction without writing a full story script.",
  "build-outline":
    "Create or improve the main goal, phase outline, required beats, relationship arc, supporting cast, ending direction, guardrails, and act/scene planning.",
  "create-characters":
    "Create or improve character cards, relationship positions, visual notes, and image prompts. Respect locked characters and avoid overwriting creator-authored identity choices.",
  "improve-playtest":
    "Use the selected playtest context if present to improve the next testable draft. Focus on clearer setup, player choice quality, pacing, and guardrails.",
};

function compactProjectForPrompt(input: CreatorStoryAssistantInput) {
  const { project, selectedActId, selectedSceneId, playtestId } = input;
  const selectedAct =
    project.structure.acts.find((act) => act.id === selectedActId) ??
    project.structure.acts.find((act) => act.id === project.structure.selectedActId) ??
    project.structure.acts[0];
  const selectedScene =
    selectedAct?.scenes.find((scene) => scene.id === selectedSceneId) ??
    selectedAct?.scenes.find((scene) => scene.id === project.structure.selectedSceneId) ??
    selectedAct?.scenes[0];
  const selectedPlaytest =
    project.playtests.find((playtest) => playtest.id === playtestId) ??
    project.playtests.find((playtest) => playtest.sourceSceneId === selectedScene?.id) ??
    project.playtests[0];

  return {
    id: project.id,
    title: project.title,
    logline: project.logline,
    synopsis: project.synopsis,
    language: project.language,
    audience: project.audience,
    genres: project.genres,
    moods: project.moods,
    tags: project.tags,
    world: project.world,
    narrative: project.narrative,
    storyOutline: project.storyOutline,
    interaction: project.interaction,
    visual: project.visual,
    assets: project.assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      title: asset.title,
      url: asset.url,
      prompt: asset.prompt,
      status: asset.status,
      characterId: asset.characterId,
      notes: asset.notes,
    })),
    runtimePolicy: {
      orientation: project.runtimePolicy.orientation,
      styleGuide: project.runtimePolicy.styleGuide,
    },
    selectedAct,
    selectedScene,
    characters: project.characters.map((character) => ({
      id: character.id,
      name: character.name,
      role: character.role,
      persona: character.persona,
      relationshipToPlayer: character.relationshipToPlayer,
      visualNotes: character.visualNotes,
      voiceNotes: character.voiceNotes,
      referenceImageUrl: character.referenceImageUrl,
      referenceImagePrompt: character.referenceImagePrompt,
      referenceImageStatus: character.referenceImageStatus,
      locked: character.locked,
    })),
    recentPlaytest: selectedPlaytest
      ? {
          id: selectedPlaytest.id,
          status: selectedPlaytest.status,
          summary: selectedPlaytest.summary,
          warnings: selectedPlaytest.warnings,
          notes: selectedPlaytest.notes,
          sceneCount: selectedPlaytest.sceneCount,
          characterCount: selectedPlaytest.characterCount,
        }
      : undefined,
  };
}

export function buildCreatorStoryAssistantMessages(
  input: CreatorStoryAssistantInput,
): ChatMessage[] {
  const skill = getCreatorAssistantSkill(input.targetSection);
  const system = [
    "You are StoryPlay Creator Story Assistant, a product-layer assistant for a creator workspace.",
    "You help creators improve a StoryProject draft. You do not expose, edit, or mention internal AgentSkill, AgentContract, AgentRegistry, parser, fallback, or runtime agent implementation details.",
    "Return JSON only. Do not wrap it in markdown.",
    "The creator must approve changes before saving, so your patch is a suggestion, not an overwrite.",
    "Only propose fields inside the allowed patch shape. Never change id, schemaVersion, createdAt, updatedAt, generation, publish, playtests, openingPackage, or internal infrastructure.",
    "For the current skill, only propose patch root keys listed in currentSkill.patchRootKeys and only edit fields listed in currentSkill.editableFields.",
    "Never edit fields listed in currentSkill.readonlyFields, even if they appear in the output schema.",
    "Respect locked characters. If a character has locked=true, do not change that character; add suggestions instead.",
    "Use the same language as project.language unless the creator explicitly asks otherwise.",
    "Keep generated text concise and directly usable inside the editor.",
    "For normal chat requests, make summary a direct creator-facing answer, not a report about what you changed. If the creator asks for a prompt or text, put the usable text in summary and also in the matching patch field. Use suggestions mainly for diagnose/audit requests.",
  ].join("\n");

  const schema = {
    summary: "string",
    suggestions: [
      {
        severity: "info | warning | critical",
        field: "string path such as storyOutline.mainGoal",
        message: "string",
      },
    ],
    patch: {
      title: "optional string",
      logline: "optional string",
      synopsis: "optional string",
      audience: "optional male | female | universal",
      genres: ["optional strings"],
      moods: ["optional strings"],
      tags: ["optional strings"],
      world: {
        setting: "optional string",
        rules: "optional string",
        tone: "optional string",
        locations: "optional string",
      },
      narrative: {
        protagonist: "optional string",
        coreConflict: "optional string",
        keyMysteries: ["optional strings"],
        chapterGoals: "optional string",
        creatorNotes: "optional string",
      },
      storyOutline: {
        mainGoal: "optional string",
        phaseOutline: "optional string",
        requiredBeats: ["optional strings"],
        relationshipArc: "optional string",
        supportingCast: "optional string",
        endingDirection: "optional string",
        guardrails: ["optional strings"],
      },
      structure: {
        acts: [
          {
            id: "optional existing id only when updating an existing act",
            title: "optional string",
            goal: "optional string",
            conflict: "optional string",
            pacing: "optional string",
            notes: "optional string",
            scenes: [
              {
                id: "optional existing id only when updating an existing scene",
                title: "optional string",
                location: "optional string",
                characters: ["optional strings"],
                purpose: "optional string",
                openingEvent: "optional string",
                playerChoices: ["optional strings"],
                emotionalBeat: "optional string",
                notes: "optional string",
              },
            ],
          },
        ],
      },
      characters: [
        {
          id: "optional existing id only when updating an unlocked existing character",
          name: "string",
          role: "protagonist | main | supporting | temporary",
          persona: "string",
          relationshipToPlayer: "string",
          visualNotes: "string",
          voiceNotes: "string",
          referenceImagePrompt: "optional string",
          locked: false,
        },
      ],
      assets: [
        {
          id: "optional existing id only when updating an existing asset",
          kind: "cover | first-scene | character-reference | style-reference | runtime-scene",
          title: "optional string",
          prompt: "optional string",
          characterId: "optional character id",
          notes: "optional string",
        },
      ],
      interaction: {
        intensity: "optional light | medium | strong",
        playMode: "optional read-heavy | choice-driven | free-explore",
        choiceDensity: "optional low | medium | high",
        branchingMode: "optional convergent | short-branch | multi-ending",
        choiceStyle: "optional string",
        branchNotes: "optional string",
        freeformInput: "optional boolean",
        freeformInputMode: "optional off | playtest-only | always",
        visualGenerationMode: "optional first-scene-only | key-scenes | every-scene",
      },
      visual: {
        stylePrompt: "optional string",
        cover: "optional string",
        firstScene: "optional string",
      },
      runtimePolicy: {
        orientation: "optional portrait | landscape",
        styleGuide: "optional string",
      },
    },
    patchNotes: [
      {
        field: "string path",
        before: "optional short string",
        after: "optional short string",
        reason: "string",
      },
    ],
    nextActions: ["string"],
  };

  const user = {
    action: input.action,
    actionGuidance: actionGuidance[input.action],
    targetSection: skill.id,
    currentSkill: {
      id: skill.id,
      label: skill.label,
      purpose: skill.purpose,
      editableFields: skill.editableFields,
      readonlyFields: skill.readonlyFields,
      patchRootKeys: skill.patchRootKeys,
      promptGuidance: skill.promptGuidance,
      quickActions: skill.quickActions,
      outputMode: skill.outputMode,
    },
    sectionGuidance: skill.promptGuidance,
    creatorInstruction: input.userInstruction ?? "",
    recentConversation: (input.conversation ?? []).slice(-8),
    locale: input.locale,
    outputSchema: schema,
    project: compactProjectForPrompt(input),
  };

  return [
    { role: "system", content: system },
    { role: "user", content: JSON.stringify(user, null, 2) },
  ];
}
