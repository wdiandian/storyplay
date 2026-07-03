import { getCreatorAssistantSkill } from "./skills/registry";
import type {
  CreatorStoryAssistantOutput,
  CreatorStoryAssistantTargetSection,
  StoryProjectPatch,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPathEditable(path: string, editableFields: string[]) {
  return editableFields.some((field) => {
    if (field === path) return true;
    if (!field.endsWith(".*")) return false;
    const prefix = field.slice(0, -2);
    return path.startsWith(`${prefix}.`);
  });
}

function isFieldEditableForTarget(
  field: string,
  targetSection: CreatorStoryAssistantTargetSection | undefined,
) {
  const skill = getCreatorAssistantSkill(targetSection);
  return skill.editableFields.some((editableField) => {
    if (isPathEditable(field, [editableField])) return true;
    if (editableField.endsWith(".*")) {
      return editableField.slice(0, -2) === field;
    }
    return editableField.startsWith(`${field}.`);
  });
}

function filterObjectChildren(
  value: Record<string, unknown>,
  path: string,
  editableFields: string[],
): Record<string, unknown> | undefined {
  const filtered: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    const next = filterValueForEditableFields(child, childPath, editableFields);
    if (next !== undefined) filtered[key] = next;
  }
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

function filterValueForEditableFields(
  value: unknown,
  path: string,
  editableFields: string[],
): unknown {
  if (value === undefined) return undefined;
  if (isPathEditable(path, editableFields)) return value;

  if (Array.isArray(value)) {
    const filteredItems = value
      .map((item) => {
        if (!isRecord(item)) return undefined;
        return filterObjectChildren(item, path, editableFields);
      })
      .filter((item): item is Record<string, unknown> => Boolean(item));
    return filteredItems.length > 0 ? filteredItems : undefined;
  }

  if (isRecord(value)) {
    return filterObjectChildren(value, path, editableFields);
  }

  return undefined;
}

export function filterCreatorAssistantPatchForSkill(
  patch: StoryProjectPatch,
  targetSection: CreatorStoryAssistantTargetSection | undefined,
): StoryProjectPatch {
  const skill = getCreatorAssistantSkill(targetSection);
  const allowedRoots = new Set<string>(skill.patchRootKeys);
  const filtered: Record<string, unknown> = {};

  for (const [root, value] of Object.entries(patch)) {
    if (!allowedRoots.has(root)) continue;
    const next = filterValueForEditableFields(value, root, skill.editableFields);
    if (next !== undefined) filtered[root] = next;
  }

  return filtered as StoryProjectPatch;
}

export function filterCreatorAssistantOutputForSkill(
  output: CreatorStoryAssistantOutput,
  targetSection: CreatorStoryAssistantTargetSection | undefined,
): CreatorStoryAssistantOutput {
  const patch = filterCreatorAssistantPatchForSkill(output.patch, targetSection);
  return {
    ...output,
    patch,
    patchNotes: output.patchNotes.filter((note) => isFieldEditableForTarget(note.field, targetSection)),
  };
}
