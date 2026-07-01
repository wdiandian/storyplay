import type { StoryProject } from "@/lib/storyProject/types";

function trim(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function listItems(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

function compactLines(lines: Array<string | undefined | null | false>) {
  return lines
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean)
    .join("\n");
}

export function renderStoryOutlineGuardrail(project: StoryProject) {
  const outline = project.storyOutline;
  return compactLines([
    trim(outline.mainGoal) ? `主线目标：${outline.mainGoal}` : "",
    trim(outline.phaseOutline) ? `阶段大纲：\n${outline.phaseOutline}` : "",
    outline.requiredBeats.length ? `必达剧情节点：\n${listItems(outline.requiredBeats)}` : "",
    trim(outline.relationshipArc) ? `角色关系走向：${outline.relationshipArc}` : "",
    trim(outline.supportingCast) ? `配角与阵营：${outline.supportingCast}` : "",
    trim(outline.endingDirection) ? `结局方向：${outline.endingDirection}` : "",
    outline.guardrails.length ? `禁止跑偏：\n${listItems(outline.guardrails)}` : "",
    "无论玩家如何选择或自由输入，后续剧情都必须围绕以上大纲推进；可以改变过程、顺序和细节，但不要脱离主线目标和结局方向。",
  ]);
}
