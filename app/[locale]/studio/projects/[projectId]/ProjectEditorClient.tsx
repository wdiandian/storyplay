"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { SettingsModal, readStoredVisionClick } from "@/components/SettingsModal";
import { readStoredModelConfig, readStoredModelMode } from "@/lib/clientModelConfig";
import { guestHeaders } from "@/lib/guestId";
import {
  hasCreatorStoryAssistantPatch,
  mergeCreatorStoryAssistantPatch,
  previewCreatorStoryAssistantPatch,
} from "@/lib/creatorAssistant/mergePatch";
import type {
  CreatorStoryAssistantAction,
  CreatorStoryAssistantConversationMessage,
  CreatorStoryAssistantOutput,
  CreatorStoryAssistantTargetSection,
} from "@/lib/creatorAssistant/types";
import {
  createStoryProjectAct,
  createStoryProjectAsset,
  createStoryProjectCharacter,
  createStoryProjectOpeningPackage,
  createStoryProjectScene,
  type StoryProject,
  type StoryProjectAct,
  type StoryProjectAudience,
  type StoryProjectAsset,
  type StoryProjectCharacter,
  type StoryProjectOpeningBeat,
  type StoryProjectScene,
} from "@/lib/storyProject/types";
import { validateOpeningPackage } from "@/lib/storyProject/openingPackage";

const genreOptions = ["恋爱", "悬疑", "奇幻", "都市", "校园", "职场", "科幻", "历史", "冒险", "成长"];
const moodOptions = ["甜", "虐", "紧张", "治愈", "暧昧", "爽感", "暗黑", "浪漫", "诡异"];
const audienceOptions: Array<{ value: StoryProjectAudience; label: string }> = [
  { value: "universal", label: "通用" },
  { value: "female", label: "女性向" },
  { value: "male", label: "男性向" },
];
const playModeOptions: Array<{ value: StoryProject["interaction"]["playMode"]; label: string }> = [
  { value: "read-heavy", label: "轻阅读" },
  { value: "choice-driven", label: "选择推进" },
  { value: "free-explore", label: "自由探索" },
];
const choiceDensityOptions: Array<{ value: StoryProject["interaction"]["choiceDensity"]; label: string }> = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];
const branchingModeOptions: Array<{ value: StoryProject["interaction"]["branchingMode"]; label: string }> = [
  { value: "convergent", label: "主线回收" },
  { value: "short-branch", label: "短分支" },
  { value: "multi-ending", label: "多结局" },
];
const freeformInputModeOptions: Array<{ value: StoryProject["interaction"]["freeformInputMode"]; label: string }> = [
  { value: "off", label: "关闭" },
  { value: "playtest-only", label: "仅试玩" },
  { value: "always", label: "正式开放" },
];
const visualGenerationModeOptions: Array<{ value: StoryProject["interaction"]["visualGenerationMode"]; label: string }> = [
  { value: "first-scene-only", label: "仅首图" },
  { value: "key-scenes", label: "关键场景" },
  { value: "every-scene", label: "每场生成" },
];

const SHOW_STORY_STRUCTURE_EDITOR = false;

type SaveState = "idle" | "saving" | "saved" | "error";
type PublishState = "idle" | "publishing" | "published" | "unpublishing" | "error";
type FixedRuntimeState = "idle" | "creating" | "created" | "error";
type AssetGeneratorTarget =
  | { kind: "cover"; characterId?: undefined }
  | { kind: "first-scene"; characterId?: undefined }
  | { kind: "character-reference"; characterId: string };
type AssetGeneratorState = {
  open: boolean;
  target: AssetGeneratorTarget | null;
  prompt: string;
  loading: boolean;
  error: string;
  resultUrl: string;
  resultUuid: string;
  resultKey: string;
  generatedPrompt: string;
};

const assistantTargets: Array<{
  value: CreatorStoryAssistantTargetSection;
  label: string;
  action: CreatorStoryAssistantAction;
}> = [
  { value: "project", label: "全工程", action: "expand-concept" },
  { value: "basics", label: "基础信息", action: "expand-concept" },
  { value: "world", label: "世界观", action: "expand-concept" },
  { value: "narrative", label: "叙事核心", action: "expand-concept" },
  { value: "outline", label: "大纲", action: "build-outline" },
  { value: "characters", label: "角色", action: "create-characters" },
  { value: "assets", label: "资产库", action: "expand-concept" },
  { value: "interaction", label: "互动", action: "expand-concept" },
  { value: "visual", label: "视觉", action: "expand-concept" },
];

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

function cloneProject(project: StoryProject): StoryProject {
  return JSON.parse(JSON.stringify(project)) as StoryProject;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]) {
  return values.join("\n");
}

function projectAudienceLabel(audience: StoryProjectAudience) {
  if (audience === "female") return "女性向";
  if (audience === "male") return "男性向";
  return "通用";
}

function getSelectedAct(project: StoryProject) {
  return (
    project.structure.acts.find((act) => act.id === project.structure.selectedActId) ??
    project.structure.acts[0]
  );
}

function getSelectedScene(project: StoryProject, act?: StoryProjectAct) {
  return (
    act?.scenes.find((scene) => scene.id === project.structure.selectedSceneId) ??
    act?.scenes[0]
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-sp-subdued">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1.5 block text-xs leading-5 text-sp-subdued">{hint}</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-sp-border bg-sp-muted px-3 text-sm text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl border border-sp-border bg-sp-muted px-3 py-2 text-sm leading-6 text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
    />
  );
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors " +
        (active
          ? "border-sp-accent bg-sp-accentSoft text-sp-accent"
          : "border-sp-border bg-sp-muted text-sp-subdued hover:border-sp-accent hover:text-sp-accent")
      }
    >
      {children}
    </button>
  );
}

function Section({
  title,
  description,
  children,
  assistantTarget,
  onAssistant,
  assistantLoading,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  assistantTarget?: CreatorStoryAssistantTargetSection;
  onAssistant?: (target: CreatorStoryAssistantTargetSection) => void;
  assistantLoading?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-semibold text-sp-text">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-sp-subdued">{description}</p>}
        </div>
        {assistantTarget && onAssistant && (
          <button
            type="button"
            onClick={() => onAssistant(assistantTarget)}
            disabled={assistantLoading}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-sp-border bg-sp-muted px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-[11px]" />
            {assistantLoading ? "生成中" : "AI 补全"}
          </button>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ProjectEditorClient({
  initialProject,
  locale,
}: {
  initialProject: StoryProject;
  locale: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState<StoryProject>(() => cloneProject(initialProject));
  const [lastSavedProject, setLastSavedProject] = useState<StoryProject>(() => cloneProject(initialProject));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [fixedRuntimeState, setFixedRuntimeState] = useState<FixedRuntimeState>("idle");
  const [buildingPlaytest, setBuildingPlaytest] = useState(false);
  const [selectedPlaytestId, setSelectedPlaytestId] = useState(initialProject.playtests[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visionClickEnabled, setVisionClickEnabled] = useState(() => readStoredVisionClick());
  const [assistantInstruction, setAssistantInstruction] = useState("");
  const [assistantConversation, setAssistantConversation] = useState<CreatorStoryAssistantConversationMessage[]>([]);
  const [assistantLoadingAction, setAssistantLoadingAction] = useState<CreatorStoryAssistantAction | "">("");
  const [assistantResult, setAssistantResult] = useState<CreatorStoryAssistantOutput | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantTarget, setAssistantTarget] = useState<CreatorStoryAssistantTargetSection>("project");
  const [assetGenerator, setAssetGenerator] = useState<AssetGeneratorState>({
    open: false,
    target: null,
    prompt: "",
    loading: false,
    error: "",
    resultUrl: "",
    resultUuid: "",
    resultKey: "",
    generatedPrompt: "",
  });
  const coverUploadRef = useRef<HTMLInputElement | null>(null);
  const firstSceneUploadRef = useRef<HTMLInputElement | null>(null);
  const characterUploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const dirty = useMemo(
    () => JSON.stringify(project) !== JSON.stringify(lastSavedProject),
    [lastSavedProject, project],
  );

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!project.title.trim()) issues.push("请输入工程标题");
    if (!project.logline.trim() && !project.synopsis.trim()) {
      issues.push("至少填写一句话概念或故事简介");
    }
    return issues;
  }, [project.logline, project.synopsis, project.title]);
  const openingIssues = useMemo(() => validateOpeningPackage(project.openingPackage), [project.openingPackage]);
  const openingErrorCount = openingIssues.filter((issue) => issue.severity === "error").length;
  const openingWarningCount = openingIssues.filter((issue) => issue.severity === "warning").length;

  const publishChecks = useMemo(
    () => [
      {
        label: "工程标题",
        detail: project.title.trim() || "首页卡片和发布记录会使用这个标题",
        passed: Boolean(project.title.trim()),
        required: true,
      },
      {
        label: "故事概念",
        detail: project.logline.trim() || project.synopsis.trim() || "至少补充一句话概念或故事简介",
        passed: Boolean(project.logline.trim() || project.synopsis.trim()),
        required: true,
      },
      {
        label: "分类标签",
        detail:
          [...project.genres, ...project.moods, ...project.tags].filter(Boolean).slice(0, 4).join(" / ") ||
          "建议补充类型、情绪或标签，方便首页筛选",
        passed: project.genres.length > 0 || project.moods.length > 0 || project.tags.length > 0,
        required: false,
      },
      {
        label: "视觉风格",
        detail: project.visual.stylePrompt.trim() || project.runtimePolicy.styleGuide.trim() || "未填写时会按 auto 处理",
        passed: Boolean(project.visual.stylePrompt.trim() || project.runtimePolicy.styleGuide.trim()),
        required: false,
      },
      {
        label: "封面",
        detail: project.visual.cover.trim() || "未填写时使用 StoryPlay 默认创作者封面",
        passed: Boolean(project.visual.cover.trim()),
        required: false,
      },
      {
        label: "固定首场",
        detail:
          project.openingPackage.status === "empty"
            ? "未启用时会回退为模型生成首场"
            : openingErrorCount === 0
              ? "发布后玩家会先进入固定首场"
              : `还有 ${openingErrorCount} 个问题，发布会暂时回退为模型生成首场`,
        passed: project.openingPackage.status !== "empty" && openingErrorCount === 0,
        required: false,
      },
      {
        label: "剧情大纲",
        detail:
          project.storyOutline.mainGoal.trim()
            ? "后续 AI 续写会围绕这份大纲推进"
            : "建议填写主线目标，否则后续生成更容易跑偏",
        passed: Boolean(project.storyOutline.mainGoal.trim()),
        required: false,
      },
    ],
    [
      project.genres,
      project.logline,
      project.moods,
      project.runtimePolicy.styleGuide,
      project.synopsis,
      project.tags,
      project.title,
      project.visual.cover,
      project.visual.stylePrompt,
      project.openingPackage.status,
      project.storyOutline.mainGoal,
      openingErrorCount,
    ],
  );
  const publishBlockingIssues = publishChecks.filter((item) => item.required && !item.passed);
  const publishedHomepageHref = localePath("/", locale);
  const publishedManagementHref = localePath("/studio/skus", locale);
  const publishedHasLocalChanges = project.publish.status === "published" && dirty;
  const publishSyncLabel = publishedHasLocalChanges
    ? "有未发布修改"
    : project.publish.status === "published"
      ? "已同步"
      : "未发布";
  const coverAsset = getAssetSlot("cover");
  const firstSceneAsset = getAssetSlot("first-scene");
  const publishPreview = {
    title: project.title.trim() || "未命名故事",
    logline: project.logline.trim() || project.synopsis.trim() || "还没有一句话卖点",
    synopsis: project.synopsis.trim() || project.logline.trim() || "还没有故事简介",
    cover: project.visual.cover.trim() || coverAsset?.url.trim() || "/home/storyplay-creator-cover.svg",
    tags: [...project.genres, ...project.moods, ...project.tags].filter(Boolean).slice(0, 5),
    audience: projectAudienceLabel(project.audience),
    source: "创作者发布",
    runtime:
      project.openingPackage.status !== "empty" && openingErrorCount === 0
        ? `固定首场 · ${project.openingPackage.scene.beats.length} beats`
        : "模型生成首场",
  };

  const selectedAct = getSelectedAct(project);
  const selectedScene = getSelectedScene(project, selectedAct);
  const selectedScenePlaytests = selectedScene
    ? project.playtests.filter((playtest) => playtest.sourceSceneId === selectedScene.id)
    : [];
  const recentScenePlaytest = selectedScenePlaytests[0];
  const visiblePlaytests = selectedScene ? selectedScenePlaytests : project.playtests;
  const selectedPlaytest =
    visiblePlaytests.find((playtest) => playtest.id === selectedPlaytestId) ?? visiblePlaytests[0];
  const assistantPatchPreview = useMemo(
    () => assistantResult ? previewCreatorStoryAssistantPatch(project, assistantResult.patch) : [],
    [assistantResult, project],
  );
  const assistantTargetMeta =
    assistantTargets.find((target) => target.value === assistantTarget) ?? assistantTargets[0]!;

  function updateProject(patch: Partial<StoryProject>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({ ...current, ...patch }));
  }

  async function runAssistant(
    action: CreatorStoryAssistantAction,
    targetSection: CreatorStoryAssistantTargetSection = assistantTarget,
    instruction = assistantInstruction,
  ) {
    const trimmedInstruction = instruction.trim();
    const requestConversation = assistantConversation.slice(-8);
    if (trimmedInstruction) {
      setAssistantConversation((current) => [
        ...current,
        { role: "creator" as const, content: trimmedInstruction },
      ].slice(-10));
      setAssistantInstruction("");
    }
    setAssistantLoadingAction(action);
    setAssistantResult(null);
    setNotice("");
    try {
      const response = await fetch(`/api/studio/projects/${project.id}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...guestHeaders() },
        body: JSON.stringify({
          action,
          project,
          userInstruction: trimmedInstruction,
          conversation: requestConversation,
          targetSection,
          selectedActId: selectedAct?.id,
          selectedSceneId: selectedScene?.id,
          playtestId: selectedPlaytest?.id,
          locale: project.language,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        result?: CreatorStoryAssistantOutput;
        error?: string;
      };

      if (!response.ok || !data.result) {
        setSaveState("error");
        setNotice(data.error || "AI 创作助手暂时不可用，请检查模型配置后重试。");
        return;
      }

      setAssistantResult(data.result);
      setAssistantConversation((current) => [
        ...current,
        { role: "assistant" as const, content: data.result!.summary },
      ].slice(-10));
      setAssistantOpen(true);
      setNotice("AI 创作助手已生成建议；应用后仍需手动保存工程。");
    } catch {
      setSaveState("error");
      setNotice("AI 创作助手请求失败，请稍后重试。");
    } finally {
      setAssistantLoadingAction("");
    }
  }

  function openAssistantForSection(targetSection: CreatorStoryAssistantTargetSection) {
    const target = assistantTargets.find((item) => item.value === targetSection);
    setAssistantTarget(targetSection);
    setAssistantOpen(true);
    void runAssistant(
      target?.action ?? "expand-concept",
      targetSection,
      `请根据当前草稿补全并优化“${target?.label ?? "当前"}”板块，保持可直接回填。`,
    );
  }

  function applyAssistantPatch() {
    if (!assistantResult || !hasCreatorStoryAssistantPatch(assistantResult.patch)) return;
    setProject((current) => mergeCreatorStoryAssistantPatch(current, assistantResult.patch));
    setSaveState("idle");
    setNotice("已应用 AI 建议到当前草稿，请确认后保存工程。");
  }

  function updateWorld(patch: Partial<StoryProject["world"]>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({ ...current, world: { ...current.world, ...patch } }));
  }

  function updateNarrative(patch: Partial<StoryProject["narrative"]>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({ ...current, narrative: { ...current.narrative, ...patch } }));
  }

  function updateStoryOutline(patch: Partial<StoryProject["storyOutline"]>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({ ...current, storyOutline: { ...current.storyOutline, ...patch } }));
  }

  function updateInteraction(patch: Partial<StoryProject["interaction"]>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      interaction: { ...current.interaction, ...patch },
    }));
  }

  function updateVisual(patch: Partial<StoryProject["visual"]>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      visual: { ...current.visual, ...patch },
      runtimePolicy: {
        ...current.runtimePolicy,
        styleGuide:
          patch.stylePrompt !== undefined && current.runtimePolicy.styleGuide === current.visual.stylePrompt
            ? patch.stylePrompt
            : current.runtimePolicy.styleGuide,
      },
    }));
  }

  function updateAssetSlot(kind: StoryProjectAsset["kind"], patch: Partial<StoryProjectAsset>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => {
      const existing = current.assets.find((asset) => asset.kind === kind && !asset.characterId);
      const nextAsset = createStoryProjectAsset({
        ...existing,
        kind,
        title:
          patch.title ??
          existing?.title ??
          (kind === "cover" ? "封面图" : kind === "first-scene" ? "首场图" : "资产"),
        ...patch,
        status:
          patch.status ??
          (patch.url !== undefined
            ? patch.url.trim()
              ? "ready"
              : "empty"
            : existing?.status),
        updatedAt: new Date().toISOString(),
      });
      const assets = existing
        ? current.assets.map((asset) => (asset.id === existing.id ? nextAsset : asset))
        : [...current.assets, nextAsset];
      return { ...current, assets };
    });
  }

  function getAssetSlot(kind: StoryProjectAsset["kind"]) {
    return project.assets.find((asset) => asset.kind === kind && !asset.characterId);
  }

  function characterById(characterId: string) {
    return project.characters.find((character) => character.id === characterId);
  }

  function defaultAssetPrompt(target: AssetGeneratorTarget) {
    if (target.kind === "cover") {
      return coverAsset?.prompt || [
        project.logline || project.title,
        project.synopsis,
        project.visual.stylePrompt,
        "突出作品卖点、人物关系和情绪钩子，不要文字。",
      ].filter(Boolean).join("\n");
    }
    if (target.kind === "first-scene") {
      return firstSceneAsset?.prompt || [
        project.openingPackage.scene.scenePrompt,
        project.world.setting,
        project.storyOutline.mainGoal,
        "作为玩家进入故事看到的第一张画面，强调场景氛围和悬念物件。",
      ].filter(Boolean).join("\n");
    }
    const character = characterById(target.characterId);
    return character?.referenceImagePrompt || [
      character?.name,
      character?.visualNotes,
      character?.persona,
      character?.relationshipToPlayer,
      project.visual.stylePrompt,
      "单人角色参考图，清晰展示脸、发型、服装和轮廓。",
    ].filter(Boolean).join("\n");
  }

  function openAssetGenerator(target: AssetGeneratorTarget) {
    setAssetGenerator({
      open: true,
      target,
      prompt: defaultAssetPrompt(target),
      loading: false,
      error: "",
      resultUrl: "",
      resultUuid: "",
      resultKey: "",
      generatedPrompt: "",
    });
  }

  function closeAssetGenerator() {
    setAssetGenerator((current) => ({ ...current, open: false, loading: false }));
  }

  function applyGeneratedAsset() {
    const target = assetGenerator.target;
    if (!target || !assetGenerator.resultUrl) return;
    if (target.kind === "cover") {
      syncAssetToVisual("cover", assetGenerator.resultUrl);
      updateAssetSlot("cover", {
        prompt: assetGenerator.generatedPrompt || assetGenerator.prompt,
        source: "generated",
        status: "ready",
        key: assetGenerator.resultKey,
        model: assetGenerator.resultUuid,
      });
    } else if (target.kind === "first-scene") {
      syncAssetToVisual("first-scene", assetGenerator.resultUrl);
      updateAssetSlot("first-scene", {
        prompt: assetGenerator.generatedPrompt || assetGenerator.prompt,
        source: "generated",
        status: "ready",
        key: assetGenerator.resultKey,
        model: assetGenerator.resultUuid,
      });
      updateOpeningScene({ backgroundImageUrl: assetGenerator.resultUrl, backgroundImageUuid: assetGenerator.resultUuid });
    } else {
      updateCharacter(target.characterId, {
        referenceImageUrl: assetGenerator.resultUrl,
        referenceImageKey: assetGenerator.resultKey,
        referenceImagePrompt: assetGenerator.generatedPrompt || assetGenerator.prompt,
        referenceImageSource: "generated",
        referenceImageStatus: "ready",
      });
    }
    setNotice("已回填生成图片到当前草稿，请保存工程。");
    closeAssetGenerator();
  }

  async function generateAssetImage() {
    const target = assetGenerator.target;
    if (!target || !assetGenerator.prompt.trim()) return;
    const character = target.kind === "character-reference" ? characterById(target.characterId) : undefined;
    setAssetGenerator((current) => ({ ...current, loading: true, error: "", resultUrl: "", resultUuid: "", resultKey: "" }));
    try {
      const response = await fetch(`/api/studio/projects/${project.id}/assets/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...guestHeaders() },
        body: JSON.stringify({
          kind: target.kind,
          prompt: assetGenerator.prompt,
          title: project.title,
          characterName: character?.name,
          characterVisualNotes: character?.visualNotes,
          stylePrompt: project.visual.stylePrompt || project.runtimePolicy.styleGuide,
          orientation: project.runtimePolicy.orientation,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        asset?: {
          imageUrl?: string;
          imageUuid?: string;
          key?: string;
          prompt?: string;
        };
        error?: string;
      };
      if (!response.ok || !data.asset?.imageUrl) {
        setAssetGenerator((current) => ({
          ...current,
          loading: false,
          error: data.error || "图片生成失败，请检查模型配置后重试。",
        }));
        return;
      }
      setAssetGenerator((current) => ({
        ...current,
        loading: false,
        resultUrl: data.asset?.imageUrl ?? "",
        resultUuid: data.asset?.imageUuid ?? "",
        resultKey: data.asset?.key ?? "",
        generatedPrompt: data.asset?.prompt ?? current.prompt,
      }));
    } catch {
      setAssetGenerator((current) => ({
        ...current,
        loading: false,
        error: "图片生成请求失败，请稍后重试。",
      }));
    }
  }

  async function handleAssetUpload(target: AssetGeneratorTarget, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("只支持图片文件。");
      return;
    }
    try {
      const formData = new FormData();
      formData.set("kind", target.kind);
      formData.set("name", file.name);
      formData.set("file", file);
      const response = await fetch(`/api/studio/projects/${project.id}/assets/upload`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        asset?: { imageUrl?: string; key?: string };
        error?: string;
      };
      if (!response.ok || !data.asset?.imageUrl) {
        setNotice(data.error || "图片上传失败。");
        return;
      }
      const uploadedUrl = data.asset.imageUrl;
      const uploadedKey = data.asset.key ?? "";
      if (target.kind === "cover") {
        syncAssetToVisual("cover", uploadedUrl);
        updateAssetSlot("cover", { source: "uploaded", status: "ready", key: uploadedKey });
      } else if (target.kind === "first-scene") {
        syncAssetToVisual("first-scene", uploadedUrl);
        updateAssetSlot("first-scene", { source: "uploaded", status: "ready", key: uploadedKey });
        updateOpeningScene({ backgroundImageUrl: uploadedUrl });
      } else {
        updateCharacter(target.characterId, {
          referenceImageUrl: uploadedUrl,
          referenceImageKey: uploadedKey,
          referenceImageSource: "uploaded",
          referenceImageStatus: "ready",
        });
      }
      setNotice("已上传图片并回填到当前草稿，请保存工程。");
    } catch {
      setNotice("图片上传失败，请换一张图片重试。");
    }
  }

  function syncAssetToVisual(kind: "cover" | "first-scene", url: string) {
    updateVisual(kind === "cover" ? { cover: url } : { firstScene: url });
    updateAssetSlot(kind, { url, status: url.trim() ? "ready" : "empty" });
  }

  function addCharacter() {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      characters: [
        ...current.characters,
        createStoryProjectCharacter({
          name: `角色 ${current.characters.length + 1}`,
          role: current.characters.length === 0 ? "main" : "supporting",
        }),
      ],
    }));
  }

  function updateCharacter(characterId: string, patch: Partial<StoryProjectCharacter>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      characters: current.characters.map((character) =>
        character.id === characterId
          ? createStoryProjectCharacter({
              ...character,
              ...patch,
              referenceImageStatus:
                patch.referenceImageStatus ??
                (patch.referenceImageUrl !== undefined
                  ? patch.referenceImageUrl.trim()
                    ? "ready"
                    : "empty"
                  : character.referenceImageStatus),
            })
          : character,
      ),
    }));
  }

  function updateOpeningPackage(patch: Partial<StoryProject["openingPackage"]>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      openingPackage: createStoryProjectOpeningPackage({
        ...current.openingPackage,
        ...patch,
        updatedAt: new Date().toISOString(),
      }),
    }));
  }

  function updateOpeningScene(patch: Partial<StoryProject["openingPackage"]["scene"]>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      openingPackage: createStoryProjectOpeningPackage({
        ...current.openingPackage,
        status: current.openingPackage.status === "empty" ? "draft" : current.openingPackage.status,
        updatedAt: new Date().toISOString(),
        scene: {
          ...current.openingPackage.scene,
          ...patch,
        },
      }),
    }));
  }

  function updateOpeningStoryState(patch: Partial<StoryProject["openingPackage"]["storyState"]>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      openingPackage: createStoryProjectOpeningPackage({
        ...current.openingPackage,
        status: current.openingPackage.status === "empty" ? "draft" : current.openingPackage.status,
        updatedAt: new Date().toISOString(),
        storyState: {
          ...current.openingPackage.storyState,
          ...patch,
        },
      }),
    }));
  }

  function updateOpeningBeat(beatId: string, patch: Partial<StoryProjectOpeningBeat>) {
    const nextBeats = project.openingPackage.scene.beats.map((beat) =>
      beat.id === beatId ? { ...beat, ...patch } : beat,
    );
    updateOpeningScene({ beats: nextBeats });
  }

  function addOpeningBeat() {
    const previousBeat = project.openingPackage.scene.beats.at(-1);
    const nextId = `b${project.openingPackage.scene.beats.length + 1}`;
    const nextBeat: StoryProjectOpeningBeat = {
      id: nextId,
      kind: "narration",
      narration: "",
      speaker: "",
      line: "",
      lineDelivery: "",
      activeCharacters: [],
      next: {
        type: "choice",
        choices: [
          {
            id: `${nextId}_exit`,
            label: "继续",
            effect: { kind: "change-scene", nextSceneSeed: "故事继续推进" },
          },
        ],
      },
      locked: true,
    };
    const beats = project.openingPackage.scene.beats.map((beat) =>
      previousBeat && beat.id === previousBeat.id
        ? { ...beat, next: { type: "continue" as const, nextBeatId: nextId } }
        : beat,
    );
    updateOpeningScene({ beats: [...beats, nextBeat] });
  }

  function selectAct(actId: string) {
    const act = project.structure.acts.find((item) => item.id === actId);
    if (!act) return;
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      structure: {
        ...current.structure,
        selectedActId: act.id,
        selectedSceneId: act.scenes[0]?.id ?? "",
      },
    }));
  }

  function selectScene(actId: string, sceneId: string) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      structure: {
        ...current.structure,
        selectedActId: actId,
        selectedSceneId: sceneId,
      },
    }));
  }

  function addAct() {
    const act = createStoryProjectAct({
      title: `第 ${project.structure.acts.length + 1} 幕`,
    });
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      structure: {
        acts: [...current.structure.acts, act],
        selectedActId: act.id,
        selectedSceneId: act.scenes[0]?.id ?? "",
      },
    }));
  }

  function addScene(actId: string) {
    const act = project.structure.acts.find((item) => item.id === actId);
    const scene = createStoryProjectScene({
      title: `第 ${(act?.scenes.length ?? 0) + 1} 场`,
    });
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      structure: {
        ...current.structure,
        acts: current.structure.acts.map((item) =>
          item.id === actId ? { ...item, scenes: [...item.scenes, scene] } : item,
        ),
        selectedActId: actId,
        selectedSceneId: scene.id,
      },
    }));
  }

  function updateAct(actId: string, patch: Partial<StoryProjectAct>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      structure: {
        ...current.structure,
        acts: current.structure.acts.map((act) =>
          act.id === actId ? { ...act, ...patch } : act,
        ),
      },
    }));
  }

  function updateScene(actId: string, sceneId: string, patch: Partial<StoryProjectScene>) {
    setSaveState("idle");
    setNotice("");
    setProject((current) => ({
      ...current,
      structure: {
        ...current.structure,
        acts: current.structure.acts.map((act) =>
          act.id === actId
            ? {
                ...act,
                scenes: act.scenes.map((scene) =>
                  scene.id === sceneId ? { ...scene, ...patch } : scene,
                ),
              }
            : act,
        ),
      },
    }));
  }

  async function saveProject(): Promise<StoryProject | null> {
    if (validationIssues.length > 0) {
      setSaveState("error");
      setNotice(validationIssues.join("；"));
      return null;
    }

    setSaveState("saving");
    setNotice("");
    try {
      const response = await fetch(`/api/studio/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        project?: StoryProject;
        error?: string;
        issues?: Array<{ message: string }>;
      };

      if (!response.ok || !data.project) {
        const issueText = data.issues?.map((issue) => issue.message).join("；");
        setSaveState("error");
        setNotice(issueText || data.error || "保存失败，请稍后重试。");
        return null;
      }

      setProject(cloneProject(data.project));
      setLastSavedProject(cloneProject(data.project));
      setSaveState("saved");
      setNotice("已保存到 StoryProject 草稿。");
      return data.project;
    } catch {
      setSaveState("error");
      setNotice("保存接口不可用，请稍后重试。");
      return null;
    }
  }

  async function ensurePlayRuntimeReady() {
    if (readStoredModelMode() === "byok" && readStoredModelConfig()) return true;

    try {
      const response = await fetch("/api/studio/runtime-status", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        serverEngineConfigured?: boolean;
      };
      if (response.ok && data.serverEngineConfigured) return true;
    } catch {
      // Fall through to the actionable message below.
    }

    setSaveState("error");
    setNotice("当前还不能生成试玩：缺少模型配置。请先打开模型设置，填写 Text / Image / Vision 三组 API 参数，或在服务端 .env.local 配置对应环境变量。");
    setSettingsOpen(true);
    return false;
  }

  async function startPlaytest() {
    if (validationIssues.length > 0) {
      setSaveState("error");
      setNotice(validationIssues.join("；"));
      return;
    }

    setBuildingPlaytest(true);
    setNotice("");
    try {
      const runtimeReady = await ensurePlayRuntimeReady();
      if (!runtimeReady) return;

      const savedProject = dirty ? await saveProject() : project;
      if (!savedProject) return;

      const response = await fetch(`/api/studio/projects/${savedProject.id}/playtest`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        build?: {
          startRequest: {
            worldSetting: string;
            styleGuide: string;
            styleReferenceImage?: string;
          };
          warnings?: Array<{ message: string }>;
        };
        playtest?: {
          id: string;
          sourceActId?: string;
          sourceSceneId?: string;
        };
        project?: StoryProject;
        error?: string;
      };

      if (!response.ok || !data.build) {
        setSaveState("error");
        setNotice(data.error || "试玩构建失败，请稍后重试。");
        return;
      }

      if (data.project) {
        setProject(cloneProject(data.project));
        setLastSavedProject(cloneProject(data.project));
        setSelectedPlaytestId(data.playtest?.id ?? data.project.playtests[0]?.id ?? "");
      }

      window.sessionStorage.setItem(
        "storyplay:custom",
        JSON.stringify({
          ...data.build.startRequest,
          source: "story-project",
          projectId: savedProject.id,
          projectTitle: savedProject.title,
          playtestId: data.playtest?.id,
          sourceActId: data.playtest?.sourceActId,
          sourceSceneId: data.playtest?.sourceSceneId,
          interactionPolicy: savedProject.interaction,
        }),
      );
      router.push(localePath("/play?custom=1", locale));
    } catch {
      setSaveState("error");
      setNotice("试玩入口不可用，请稍后重试。");
    } finally {
      setBuildingPlaytest(false);
    }
  }

  async function publishProject() {
    if (publishBlockingIssues.length > 0) {
      setSaveState("error");
      setPublishState("error");
      setNotice(publishBlockingIssues.map((issue) => issue.detail).join("；"));
      return;
    }

    setPublishState("publishing");
    setNotice("");
    try {
      const savedProject = dirty ? await saveProject() : project;
      if (!savedProject) {
        setPublishState("error");
        return;
      }

      const response = await fetch(`/api/studio/projects/${savedProject.id}/publish`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        sku?: { id: string };
        project?: StoryProject;
        warnings?: Array<{ message: string }>;
        error?: string;
        issues?: Array<{ message: string }>;
      };

      if (!response.ok || !data.sku || !data.project) {
        const issueText = data.issues?.map((issue) => issue.message).join("；");
        setPublishState("error");
        setNotice(issueText || data.error || "发布失败，请稍后重试。");
        return;
      }

      setProject(cloneProject(data.project));
      setLastSavedProject(cloneProject(data.project));
      setSaveState("saved");
      setPublishState("published");
      const warningText = data.warnings?.length ? `，${data.warnings.length} 条运行提示待补充` : "";
      setNotice(`已发布到首页：${data.sku.id}${warningText}`);
    } catch {
      setPublishState("error");
      setNotice("发布接口不可用，请稍后重试。");
    }
  }

  async function createFixedRuntimeFromPlaytest(playtestId: string) {
    if (!playtestId || fixedRuntimeState === "creating") return;

    setFixedRuntimeState("creating");
    setNotice("");
    try {
      const savedProject = dirty ? await saveProject() : project;
      if (!savedProject) {
        setFixedRuntimeState("error");
        return;
      }

      const response = await fetch(`/api/studio/projects/${savedProject.id}/fixed-runtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playtestId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        fixedRuntimePackage?: StoryProject["fixedRuntimePackages"][number];
        project?: StoryProject;
        error?: string;
      };

      if (!response.ok || !data.fixedRuntimePackage || !data.project) {
        setFixedRuntimeState("error");
        setNotice(data.error || "固定剧情包创建失败。请先完成一次试玩并回到后台刷新记录。");
        return;
      }

      setProject(cloneProject(data.project));
      setLastSavedProject(cloneProject(data.project));
      setSelectedPlaytestId(playtestId);
      setSaveState("saved");
      setFixedRuntimeState("created");
      setNotice(
        `已固定剧情包：${data.fixedRuntimePackage.sceneCount} 场 / ${data.fixedRuntimePackage.beatCount} beat。重新发布后玩家会优先体验固定内容。`,
      );
    } catch {
      setFixedRuntimeState("error");
      setNotice("固定剧情包接口不可用，请稍后重试。");
    }
  }

  async function unpublishProject() {
    if (project.publish.status !== "published" || !project.publish.skuId) return;

    const confirmed = window.confirm(
      `确定取消发布「${project.title || "未命名故事"}」吗？这只会从首页和发布管理中移除作品，故事工程内容会保留。`,
    );
    if (!confirmed) return;

    setPublishState("unpublishing");
    setNotice("");
    try {
      const savedProject = dirty ? await saveProject() : project;
      if (!savedProject) {
        setPublishState("error");
        return;
      }

      const response = await fetch(`/api/studio/skus/${encodeURIComponent(savedProject.publish.skuId)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        project?: StoryProject;
        error?: string;
      };

      if (!response.ok || !data.project) {
        setPublishState("error");
        setNotice(data.error || "取消发布失败，请稍后重试。");
        return;
      }

      setProject(cloneProject(data.project));
      setLastSavedProject(cloneProject(data.project));
      setSaveState("saved");
      setPublishState("idle");
      setNotice("已取消发布；故事工程仍保留，可继续编辑后重新发布。");
    } catch {
      setPublishState("error");
      setNotice("取消发布接口不可用，请稍后重试。");
    }
  }

  function resetChanges() {
    setProject(cloneProject(lastSavedProject));
    setSaveState("idle");
    setNotice("");
  }

  return (
    <>
    <main className="min-h-screen bg-sp-bg text-sp-text">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-5 md:px-8 md:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={localePath("/studio/projects", locale)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-4 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
          >
            <i className="fa-solid fa-arrow-left text-[12px]" />
            返回故事工程
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <span className="inline-flex h-10 items-center rounded-xl border border-sp-border bg-sp-muted px-3 text-xs font-medium text-sp-subdued">
                有未保存修改
              </span>
            )}
            <button
              type="button"
              onClick={resetChanges}
              disabled={!dirty || saveState === "saving"}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-4 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="fa-solid fa-rotate-left text-[12px]" />
              撤销修改
            </button>
            <button
              type="button"
              onClick={saveProject}
              disabled={saveState === "saving" || buildingPlaytest || publishState === "publishing"}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-solid fa-floppy-disk text-[12px]" />
              {saveState === "saving" ? "保存中" : "保存工程"}
            </button>
            <button
              type="button"
              onClick={publishProject}
              disabled={
                publishState === "publishing" ||
                publishState === "unpublishing" ||
                saveState === "saving" ||
                buildingPlaytest ||
                publishBlockingIssues.length > 0
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-sp-accent bg-sp-accentSoft px-4 text-sm font-semibold text-sp-accent transition-colors hover:bg-sp-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-solid fa-paper-plane text-[12px]" />
              {publishState === "publishing"
                ? "发布中"
                : publishState === "unpublishing"
                  ? "取消发布中"
                : project.publish.status === "published"
                  ? "重新发布"
                  : "发布到首页"}
            </button>
            {project.publish.status === "published" && (
              <Link
                href={publishedHomepageHref}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-4 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[12px]" />
                查看首页
              </Link>
            )}
          </div>
        </div>

        <header className="rounded-2xl border border-sp-border bg-sp-surface p-6 shadow-sm shadow-black/[0.04]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs text-sp-subdued">{project.id}</div>
              <input
                value={project.title}
                onChange={(event) => updateProject({ title: event.target.value })}
                className="mt-3 w-full border-0 bg-transparent p-0 font-serif text-3xl font-black leading-tight text-sp-text outline-none placeholder:text-sp-subdued md:text-5xl"
                placeholder="未命名故事工程"
              />
              <p className="mt-3 text-sm leading-7 text-sp-subdued md:text-[15px]">
                在下方故事蓝图里定义核心承诺、主线目标和必达节点；顶部只保留工程识别信息。
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="rounded-full bg-sp-accentSoft px-3 py-1 text-xs font-medium text-sp-accent">
                {project.publish.status}
              </span>
              <span className="rounded-full border border-sp-border bg-sp-muted px-3 py-1 text-xs text-sp-subdued">
                {project.language}
              </span>
            </div>
          </div>

          {(notice || validationIssues.length > 0) && (
            <div
              className={
                "mt-5 rounded-xl border p-3 text-xs leading-5 " +
                (saveState === "error" || validationIssues.length > 0
                  ? "border-sp-accent bg-sp-accentSoft text-sp-accent"
                  : "border-sp-border bg-sp-muted text-sp-subdued")
              }
            >
              {notice || validationIssues.join("；")}
            </div>
          )}
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Section
              title="基础信息"
              description="定义作品在创作台和后续分发中的基础定位。"
              assistantTarget="basics"
              onAssistant={openAssistantForSection}
              assistantLoading={Boolean(assistantLoadingAction)}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="故事简介">
                  <TextArea
                    value={project.synopsis}
                    onChange={(value) => updateProject({ synopsis: value })}
                    placeholder="补充主要关系、悬念、冲突和玩家体验。"
                    rows={6}
                  />
                </Field>
                <div className="space-y-5">
                  <Field label="主角 / 玩家位置">
                    <TextInput
                      value={project.narrative.protagonist}
                      onChange={(value) => updateNarrative({ protagonist: value })}
                      placeholder="例如：刚搬来的夜班店员"
                    />
                  </Field>
                  <Field label="核心冲突">
                    <TextInput
                      value={project.narrative.coreConflict}
                      onChange={(value) => updateNarrative({ coreConflict: value })}
                      placeholder="玩家必须解决什么问题？"
                    />
                  </Field>
                  <div>
                    <div className="text-[11px] font-medium text-sp-subdued">目标受众</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {audienceOptions.map((option) => (
                        <OptionButton
                          key={option.value}
                          active={project.audience === option.value}
                          onClick={() => updateProject({ audience: option.value })}
                        >
                          {option.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>
                  <Field label="自定义标签" hint="用换行分隔，后续可用于检索和发布包装。">
                    <TextArea
                      value={joinLines(project.tags)}
                      onChange={(value) => updateProject({ tags: splitLines(value) })}
                      placeholder={"多结局\n高互动"}
                      rows={3}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <Section
              title="世界观"
              description="给生成链路稳定的规则、地点和调性约束。"
              assistantTarget="world"
              onAssistant={openAssistantForSection}
              assistantLoading={Boolean(assistantLoadingAction)}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="世界设定">
                  <TextArea
                    value={project.world.setting}
                    onChange={(value) => updateWorld({ setting: value })}
                    placeholder="故事发生在哪里？世界有什么核心规则？"
                    rows={5}
                  />
                </Field>
                <Field label="世界规则">
                  <TextArea
                    value={project.world.rules}
                    onChange={(value) => updateWorld({ rules: value })}
                    placeholder="哪些设定不能被生成结果打破？"
                    rows={5}
                  />
                </Field>
                <Field label="主要地点">
                  <TextArea
                    value={project.world.locations}
                    onChange={(value) => updateWorld({ locations: value })}
                    placeholder="列出关键地点、空间关系和视觉特征。"
                    rows={4}
                  />
                </Field>
                <Field label="叙事调性">
                  <TextArea
                    value={project.world.tone}
                    onChange={(value) => updateWorld({ tone: value })}
                    placeholder="例如：暧昧、紧张、低饱和电影感。"
                    rows={4}
                  />
                </Field>
              </div>
            </Section>

            <Section
              title="故事蓝图"
              description="这里只定义故事推进契约：玩家可以改变过程，但剧情要围绕这些目标、节点和边界前进。"
              assistantTarget="outline"
              onAssistant={openAssistantForSection}
              assistantLoading={Boolean(assistantLoadingAction)}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="核心承诺" hint="对应首页和试玩生成的核心卖点。">
                  <TextArea
                    value={project.logline}
                    onChange={(value) => updateProject({ logline: value })}
                    placeholder="例如：在一场无法停止的雨夜循环里，玩家要决定救下谁、放弃谁。"
                    rows={3}
                  />
                </Field>
                <Field label="主线目标" hint="无论玩家怎么选，故事最终都要围绕这个目标推进。">
                  <TextArea
                    value={project.storyOutline.mainGoal}
                    onChange={(value) => updateStoryOutline({ mainGoal: value })}
                    placeholder="例如：玩家要弄清雨夜循环的真相，并决定是否打破循环。"
                    rows={3}
                  />
                </Field>
                <Field label="阶段大纲" hint="不是剧情树，只写大概推进顺序。">
                  <TextArea
                    value={project.storyOutline.phaseOutline}
                    onChange={(value) => updateStoryOutline({ phaseOutline: value })}
                    placeholder={"1. 发现异常\n2. 与关键角色建立信任\n3. 第一次反转\n4. 接近真相\n5. 面对最终选择"}
                    rows={4}
                  />
                </Field>
                <Field label="必达剧情节点" hint="用换行分隔；玩家可以改变过程，但这些节点迟早要触达。">
                  <TextArea
                    value={joinLines(project.storyOutline.requiredBeats)}
                    onChange={(value) => updateStoryOutline({ requiredBeats: splitLines(value) })}
                    placeholder={"玩家发现便利店时钟总停在 23:17\n夏海承认她保留了上一轮记忆\n玩家得知循环和自己的选择有关"}
                    rows={4}
                  />
                </Field>
                <Field label="禁止跑偏" hint="用换行分隔。">
                  <TextArea
                    value={joinLines(project.storyOutline.guardrails)}
                    onChange={(value) => updateStoryOutline({ guardrails: splitLines(value) })}
                    placeholder={"不要突然变成无关冒险\n不要杀掉夏海\n不要跳出雨夜循环题材"}
                    rows={3}
                  />
                </Field>
                <Field label="结局方向" hint="可选。只写故事最终要抵达的情绪或代价，不写完整剧情树。">
                  <TextArea
                    value={project.storyOutline.endingDirection}
                    onChange={(value) => updateStoryOutline({ endingDirection: value })}
                    placeholder="例如：开放式结局；玩家可以打破循环，但必须付出关系代价。"
                    rows={3}
                  />
                </Field>
              </div>
            </Section>

            <Section title="首个可玩片段（兼容）" description="这块暂时保留旧发布链路；后续会被固定剧情包取代。优先把稳定内容沉淀到故事蓝图和资产库。">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sp-border bg-sp-muted p-4">
                  <div>
                    <div className="text-sm font-semibold text-sp-text">旧首场运行包</div>
                    <p className="mt-1 text-xs leading-5 text-sp-subdued">
                      当前状态：{project.openingPackage.status === "ready" ? "已就绪" : project.openingPackage.status === "draft" ? "草稿" : "未启用"}
                      {project.openingPackage.status !== "empty" && `，${openingErrorCount} 个错误 / ${openingWarningCount} 个提示`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateOpeningPackage({ status: project.openingPackage.status === "empty" ? "draft" : "empty" })}
                      className="inline-flex h-9 items-center rounded-xl border border-sp-border bg-sp-surface px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                    >
                      {project.openingPackage.status === "empty" ? "启用兼容首场" : "停用兼容首场"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateOpeningPackage({ status: openingErrorCount === 0 ? "ready" : "draft" })}
                      disabled={project.openingPackage.status === "empty"}
                      className="inline-flex h-9 items-center rounded-xl bg-sp-accent px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      标记为就绪
                    </button>
                  </div>
                </div>

                {project.openingPackage.status !== "empty" && (
                  <>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="首场标题">
                        <TextInput
                          value={project.openingPackage.scene.title}
                          onChange={(value) => updateOpeningScene({ title: value })}
                          placeholder="例如：雨夜便利店"
                        />
                      </Field>
                      <Field label="地点 / 场景 Key">
                        <TextInput
                          value={project.openingPackage.scene.sceneKey}
                          onChange={(value) => updateOpeningScene({ sceneKey: value })}
                          placeholder="convenience-store-rain-night"
                        />
                      </Field>
                      <Field label="背景图 URL" hint="MVP 阶段先填可访问图片 URL，后续再接上传和生图。">
                        <TextInput
                          value={project.openingPackage.scene.backgroundImageUrl}
                          onChange={(value) => updateOpeningScene({ backgroundImageUrl: value })}
                          placeholder="/home/firstscene/m0.webp"
                        />
                      </Field>
                      <Field label="场景地点描述">
                        <TextInput
                          value={project.openingPackage.scene.location}
                          onChange={(value) => updateOpeningScene({ location: value })}
                          placeholder="深夜、雨中的街角便利店门口"
                        />
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="画面描述 / Scene Prompt">
                          <TextArea
                            value={project.openingPackage.scene.scenePrompt}
                            onChange={(value) => updateOpeningScene({ scenePrompt: value })}
                            placeholder="描述固定首场背景图的空间、光线、氛围和重要物件。"
                            rows={4}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-sp-text">脚本 Beat</div>
                          <p className="mt-1 text-xs text-sp-subdued">按顺序播放；最后一个 Beat 通常配置为进入 AI 续写。</p>
                        </div>
                        <button
                          type="button"
                          onClick={addOpeningBeat}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-sp-border bg-sp-muted px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                        >
                          <i className="fa-solid fa-plus text-[10px]" />
                          新增 Beat
                        </button>
                      </div>

                      {project.openingPackage.scene.beats.map((beat, index) => (
                        <div key={beat.id} className="rounded-xl border border-sp-border bg-sp-muted p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="font-mono text-xs text-sp-subdued">
                              {beat.id} {project.openingPackage.scene.entryBeatId === beat.id ? " / 入口" : ""}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateOpeningScene({ entryBeatId: beat.id })}
                              className="inline-flex h-8 items-center rounded-lg border border-sp-border bg-sp-surface px-3 text-[11px] font-medium text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                            >
                              设为入口
                            </button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="旁白">
                              <TextArea
                                value={beat.narration}
                                onChange={(value) => updateOpeningBeat(beat.id, { narration: value })}
                                placeholder="玩家看到的环境、动作或心理描写。"
                                rows={3}
                              />
                            </Field>
                            <div className="space-y-4">
                              <Field label="说话人">
                                <TextInput
                                  value={beat.speaker}
                                  onChange={(value) => updateOpeningBeat(beat.id, { speaker: value, kind: value ? "dialogue" : beat.kind })}
                                  placeholder="留空表示纯旁白"
                                />
                              </Field>
                              <Field label="对白">
                                <TextArea
                                  value={beat.line}
                                  onChange={(value) => updateOpeningBeat(beat.id, { line: value, kind: value ? "dialogue" : beat.kind })}
                                  placeholder="角色说出口的台词。"
                                  rows={2}
                                />
                              </Field>
                            </div>
                            <Field label="出场角色 / 姿态" hint="每行一个：角色名：姿态说明">
                              <TextArea
                                value={beat.activeCharacters.map((character) => `${character.name}${character.pose ? `：${character.pose}` : ""}`).join("\n")}
                                onChange={(value) =>
                                  updateOpeningBeat(beat.id, {
                                    activeCharacters: splitLines(value).map((line) => {
                                      const [name, ...poseParts] = line.split(/[:：]/);
                                      return { name: name?.trim() ?? "", pose: poseParts.join("：").trim() };
                                    }).filter((character) => character.name),
                                  })
                                }
                                placeholder={"夏海：站在雨里，握着一把透明伞\n店长：隔着玻璃望向门口"}
                                rows={3}
                              />
                            </Field>
                            <Field label={index === project.openingPackage.scene.beats.length - 1 ? "AI 续写方向" : "下一 Beat"}>
                              {index === project.openingPackage.scene.beats.length - 1 ? (
                                <TextArea
                                  value={
                                    beat.next.type === "choice" && beat.next.choices[0]?.effect.kind === "change-scene"
                                      ? beat.next.choices[0].effect.nextSceneSeed
                                      : ""
                                  }
                                  onChange={(value) =>
                                    updateOpeningBeat(beat.id, {
                                      next: {
                                        type: "choice",
                                        choices: [
                                          {
                                            id: `${beat.id}_exit`,
                                            label: "继续",
                                            effect: { kind: "change-scene", nextSceneSeed: value },
                                          },
                                        ],
                                      },
                                    })
                                  }
                                  placeholder="玩家离开首场后，第二场应该朝什么方向继续？"
                                  rows={3}
                                />
                              ) : (
                                <TextInput
                                  value={beat.next.type === "continue" ? beat.next.nextBeatId : ""}
                                  onChange={(value) => updateOpeningBeat(beat.id, { next: { type: "continue", nextBeatId: value } })}
                                  placeholder={project.openingPackage.scene.beats[index + 1]?.id}
                                />
                              )}
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="首场后故事摘要">
                        <TextArea
                          value={project.openingPackage.storyState.synopsis}
                          onChange={(value) => updateOpeningStoryState({ synopsis: value })}
                          placeholder="首场结束后，系统应该记住已经发生了什么。"
                          rows={3}
                        />
                      </Field>
                      <Field label="下一场钩子">
                        <TextArea
                          value={project.openingPackage.storyState.nextHook}
                          onChange={(value) => updateOpeningStoryState({ nextHook: value })}
                          placeholder="AI 续写时优先推进的悬念、冲突或反转。"
                          rows={3}
                        />
                      </Field>
                      <Field label="未解悬念" hint="用换行分隔。">
                        <TextArea
                          value={joinLines(project.openingPackage.storyState.openThreads)}
                          onChange={(value) => updateOpeningStoryState({ openThreads: splitLines(value) })}
                          placeholder={"她为什么知道玩家的名字？\n雨夜循环是否已经开始？"}
                          rows={3}
                        />
                      </Field>
                      <Field label="人物关系状态" hint="用换行分隔。">
                        <TextArea
                          value={joinLines(project.openingPackage.storyState.relationships)}
                          onChange={(value) => updateOpeningStoryState({ relationships: splitLines(value) })}
                          placeholder="夏海：认识玩家，但刻意隐瞒原因。"
                          rows={3}
                        />
                      </Field>
                    </div>

                    {openingIssues.length > 0 && (
                      <div className="rounded-xl border border-sp-border bg-sp-muted p-4">
                        <div className="text-sm font-semibold text-sp-text">首场检查</div>
                        <div className="mt-3 space-y-2">
                          {openingIssues.slice(0, 6).map((issue) => (
                            <div key={`${issue.field}-${issue.message}`} className="flex gap-2 text-xs leading-5 text-sp-subdued">
                              <span className={issue.severity === "error" ? "text-sp-accent" : "text-sp-subdued"}>
                                {issue.severity === "error" ? "必填" : "提示"}
                              </span>
                              <span>{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Section>

            <Section
              title="资产库"
              description="提前准备封面、首场图和主体角色参考图，用来加速首次游玩并稳定视觉一致性。"
              assistantTarget="assets"
              onAssistant={openAssistantForSection}
              assistantLoading={Boolean(assistantLoadingAction)}
            >
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-xl border border-sp-border bg-sp-muted p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-sp-text">封面图</div>
                        <p className="mt-1 text-xs leading-5 text-sp-subdued">
                          用于首页卡片和发布预览。后续接生成弹窗和上传。
                        </p>
                      </div>
                      <span className="rounded-full border border-sp-border bg-sp-surface px-2 py-0.5 text-[11px] text-sp-subdued">
                        {coverAsset?.status ?? (project.visual.cover ? "ready" : "empty")}
                      </span>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div className="overflow-hidden rounded-xl border border-sp-border bg-sp-surface">
                        {project.visual.cover || coverAsset?.url ? (
                          <img
                            src={project.visual.cover || coverAsset?.url || ""}
                            alt=""
                            className="aspect-[4/5] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center px-4 text-center text-xs leading-5 text-sp-subdued">
                            尚未准备封面图，请生成或上传。
                          </div>
                        )}
                      </div>
                      <Field label="封面生成提示词">
                        <TextArea
                          value={coverAsset?.prompt ?? ""}
                          onChange={(value) => updateAssetSlot("cover", { prompt: value })}
                          placeholder="描述封面的主体、情绪、构图和卖点。"
                          rows={3}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openAssetGenerator({ kind: "cover" })}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                        >
                          <i className="fa-regular fa-image text-[12px]" />
                          生成封面
                        </button>
                        <input
                          ref={coverUploadRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            void handleAssetUpload({ kind: "cover" }, event.target.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => coverUploadRef.current?.click()}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                        >
                          <i className="fa-solid fa-upload text-[12px]" />
                          上传
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-sp-border bg-sp-muted p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-sp-text">首场图</div>
                        <p className="mt-1 text-xs leading-5 text-sp-subdued">
                          玩家进入故事时优先展示，减少首次等待。
                        </p>
                      </div>
                      <span className="rounded-full border border-sp-border bg-sp-surface px-2 py-0.5 text-[11px] text-sp-subdued">
                        {firstSceneAsset?.status ?? (project.visual.firstScene ? "ready" : "empty")}
                      </span>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div className="overflow-hidden rounded-xl border border-sp-border bg-sp-surface">
                        {project.visual.firstScene || firstSceneAsset?.url ? (
                          <img
                            src={project.visual.firstScene || firstSceneAsset?.url || ""}
                            alt=""
                            className="aspect-[4/5] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center px-4 text-center text-xs leading-5 text-sp-subdued">
                            尚未准备首场图，请生成或上传。
                          </div>
                        )}
                      </div>
                      <Field label="首场图生成提示词">
                        <TextArea
                          value={firstSceneAsset?.prompt ?? ""}
                          onChange={(value) => updateAssetSlot("first-scene", { prompt: value })}
                          placeholder="描述第一眼看到的场景、光线、人物站位和悬念物件。"
                          rows={3}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openAssetGenerator({ kind: "first-scene" })}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                        >
                          <i className="fa-regular fa-image text-[12px]" />
                          生成首场图
                        </button>
                        <input
                          ref={firstSceneUploadRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            void handleAssetUpload({ kind: "first-scene" }, event.target.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => firstSceneUploadRef.current?.click()}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                        >
                          <i className="fa-solid fa-upload text-[12px]" />
                          上传
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-sp-border bg-sp-muted p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-sp-text">主体角色参考图</div>
                      <p className="mt-1 text-xs leading-5 text-sp-subdued">
                        先锁定主角和核心角色。后续生图 agent 会优先使用这些参考图。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addCharacter}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                    >
                      <i className="fa-solid fa-plus text-[10px]" />
                      新增角色
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {project.characters.length === 0 && (
                      <div className="rounded-xl border border-dashed border-sp-border bg-sp-surface p-4 text-sm leading-6 text-sp-subdued">
                        暂无角色。可以手动新增，或用 AI 创作助手生成角色卡后再补参考图。
                      </div>
                    )}
                    {project.characters.map((character) => (
                      <div key={character.id} className="grid gap-4 rounded-xl border border-sp-border bg-sp-surface p-4 md:grid-cols-[minmax(0,1fr)_160px]">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="角色名">
                            <TextInput
                              value={character.name}
                              onChange={(value) => updateCharacter(character.id, { name: value })}
                              placeholder="角色名"
                            />
                          </Field>
                          <Field label="角色关系">
                            <TextInput
                              value={character.relationshipToPlayer}
                              onChange={(value) => updateCharacter(character.id, { relationshipToPlayer: value })}
                              placeholder="与玩家/主角的关系"
                            />
                          </Field>
                          <Field label="角色功能 / 性格">
                            <TextArea
                              value={character.persona}
                              onChange={(value) => updateCharacter(character.id, { persona: value })}
                              placeholder="她在故事里承担什么功能，性格和动机是什么。"
                              rows={3}
                            />
                          </Field>
                          <Field label="视觉设定">
                            <TextArea
                              value={character.visualNotes}
                              onChange={(value) => updateCharacter(character.id, { visualNotes: value })}
                              placeholder="外貌、服装、气质、识别点。"
                              rows={3}
                            />
                          </Field>
                          <Field label="参考图 URL">
                            <TextInput
                              value={character.referenceImageUrl}
                              onChange={(value) => updateCharacter(character.id, { referenceImageUrl: value })}
                              placeholder="https://..."
                            />
                          </Field>
                          <Field label="参考图生成提示词">
                            <TextInput
                              value={character.referenceImagePrompt}
                              onChange={(value) => updateCharacter(character.id, { referenceImagePrompt: value })}
                              placeholder="角色立绘或概念图提示词"
                            />
                          </Field>
                        </div>
                        <div className="flex flex-col justify-between gap-3">
                          <div className="overflow-hidden rounded-xl border border-sp-border bg-sp-muted">
                            {character.referenceImageUrl ? (
                              <img
                                src={character.referenceImageUrl}
                                alt=""
                                className="aspect-[3/4] w-full object-cover"
                              />
                            ) : (
                              <div className="flex aspect-[3/4] items-center justify-center text-xs text-sp-subdued">
                                未绑定参考图
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openAssetGenerator({ kind: "character-reference", characterId: character.id })}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-sp-border bg-sp-muted px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                          >
                            <i className="fa-regular fa-image text-[12px]" />
                            生成参考图
                          </button>
                          <input
                            ref={(node) => {
                              characterUploadRefs.current[character.id] = node;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              void handleAssetUpload(
                                { kind: "character-reference", characterId: character.id },
                                event.target.files?.[0],
                              );
                              event.currentTarget.value = "";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => characterUploadRefs.current[character.id]?.click()}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-sp-border bg-sp-muted px-3 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                          >
                            <i className="fa-solid fa-upload text-[12px]" />
                            上传
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {SHOW_STORY_STRUCTURE_EDITOR && (
            <Section title="故事结构" description="先用幕和场景固定创作意图，试玩会优先读取当前选中的场景。">
              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-medium text-sp-subdued">幕 / 场景</div>
                    <button
                      type="button"
                      onClick={addAct}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-sp-border bg-sp-muted px-3 text-xs font-medium text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                    >
                      <i className="fa-solid fa-plus text-[10px]" />
                      新增幕
                    </button>
                  </div>
                  <div className="space-y-2">
                    {project.structure.acts.map((act, actIndex) => {
                      const actActive = selectedAct?.id === act.id;
                      return (
                        <div
                          key={act.id}
                          className={
                            "rounded-xl border p-2 " +
                            (actActive ? "border-sp-accent bg-sp-accentSoft" : "border-sp-border bg-sp-muted")
                          }
                        >
                          <button
                            type="button"
                            onClick={() => selectAct(act.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left"
                          >
                            <span className="truncate text-sm font-semibold text-sp-text">
                              {act.title || `第 ${actIndex + 1} 幕`}
                            </span>
                            <span className="text-[11px] text-sp-subdued">{act.scenes.length} 场</span>
                          </button>
                          <div className="mt-1 space-y-1">
                            {act.scenes.map((scene, sceneIndex) => {
                              const sceneActive = selectedAct?.id === act.id && selectedScene?.id === scene.id;
                              return (
                                <button
                                  key={scene.id}
                                  type="button"
                                  onClick={() => selectScene(act.id, scene.id)}
                                  className={
                                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors " +
                                    (sceneActive
                                      ? "bg-sp-surface text-sp-accent"
                                      : "text-sp-subdued hover:bg-sp-surface hover:text-sp-text")
                                  }
                                >
                                  <span className="font-mono text-[10px]">{sceneIndex + 1}</span>
                                  <span className="truncate">{scene.title || `第 ${sceneIndex + 1} 场`}</span>
                                </button>
                              );
                            })}
                          </div>
                          {actActive && (
                            <button
                              type="button"
                              onClick={() => addScene(act.id)}
                              className="mt-2 inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-sp-border bg-sp-surface px-3 text-xs font-medium text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                            >
                              <i className="fa-solid fa-plus text-[10px]" />
                              新增场景
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedAct && selectedScene ? (
                  <div className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="幕标题">
                        <TextInput
                          value={selectedAct.title}
                          onChange={(value) => updateAct(selectedAct.id, { title: value })}
                          placeholder="例如：雨夜重逢"
                        />
                      </Field>
                      <Field label="幕目标">
                        <TextInput
                          value={selectedAct.goal}
                          onChange={(value) => updateAct(selectedAct.id, { goal: value })}
                          placeholder="这一幕希望玩家经历什么？"
                        />
                      </Field>
                      <Field label="幕冲突">
                        <TextArea
                          value={selectedAct.conflict}
                          onChange={(value) => updateAct(selectedAct.id, { conflict: value })}
                          placeholder="这一幕主要矛盾、阻碍或反转。"
                          rows={3}
                        />
                      </Field>
                      <Field label="节奏说明">
                        <TextArea
                          value={selectedAct.pacing}
                          onChange={(value) => updateAct(selectedAct.id, { pacing: value })}
                          placeholder="例如：慢热开场，中段压迫，结尾留下悬念。"
                          rows={3}
                        />
                      </Field>
                    </div>

                    <div className="rounded-xl border border-sp-border bg-sp-muted p-4">
                      <div className="grid gap-5 md:grid-cols-2">
                        <Field label="场景标题">
                          <TextInput
                            value={selectedScene.title}
                            onChange={(value) => updateScene(selectedAct.id, selectedScene.id, { title: value })}
                            placeholder="例如：便利店门口"
                          />
                        </Field>
                        <Field label="地点">
                          <TextInput
                            value={selectedScene.location}
                            onChange={(value) => updateScene(selectedAct.id, selectedScene.id, { location: value })}
                            placeholder="具体空间、时间、天气或氛围。"
                          />
                        </Field>
                        <Field label="出场角色" hint="用换行分隔。">
                          <TextArea
                            value={joinLines(selectedScene.characters)}
                            onChange={(value) =>
                              updateScene(selectedAct.id, selectedScene.id, { characters: splitLines(value) })
                            }
                            placeholder={"夏海\n店长"}
                            rows={3}
                          />
                        </Field>
                        <Field label="玩家选择点" hint="用换行分隔，试玩时会作为选择设计参考。">
                          <TextArea
                            value={joinLines(selectedScene.playerChoices)}
                            onChange={(value) =>
                              updateScene(selectedAct.id, selectedScene.id, { playerChoices: splitLines(value) })
                            }
                            placeholder={"追问她为什么出现\n假装没看见，先进店"}
                            rows={3}
                          />
                        </Field>
                        <Field label="剧情目的">
                          <TextArea
                            value={selectedScene.purpose}
                            onChange={(value) => updateScene(selectedAct.id, selectedScene.id, { purpose: value })}
                            placeholder="这一场必须推进什么信息、关系或悬念？"
                            rows={3}
                          />
                        </Field>
                        <Field label="开场事件">
                          <TextArea
                            value={selectedScene.openingEvent}
                            onChange={(value) =>
                              updateScene(selectedAct.id, selectedScene.id, { openingEvent: value })
                            }
                            placeholder="玩家进入这一场时立刻发生的事。"
                            rows={3}
                          />
                        </Field>
                        <Field label="情绪节拍">
                          <TextInput
                            value={selectedScene.emotionalBeat}
                            onChange={(value) =>
                              updateScene(selectedAct.id, selectedScene.id, { emotionalBeat: value })
                            }
                            placeholder="例如：暧昧、压迫、失控、释然。"
                          />
                        </Field>
                        <Field label="场景备注">
                          <TextInput
                            value={selectedScene.notes}
                            onChange={(value) => updateScene(selectedAct.id, selectedScene.id, { notes: value })}
                            placeholder="只给创作者和生成链路看的补充约束。"
                          />
                        </Field>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-sp-border pt-4 md:flex-row md:items-center md:justify-between">
                        <div className="text-xs leading-5 text-sp-subdued">
                          当前场景已有 {selectedScenePlaytests.length} 次试玩记录。
                        </div>
                        <button
                          type="button"
                          onClick={startPlaytest}
                          disabled={buildingPlaytest || saveState === "saving"}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <i className="fa-solid fa-play text-[12px]" />
                          {buildingPlaytest ? "准备试玩中" : "试玩此场景"}
                        </button>
                      </div>
                    </div>

                    {(selectedScene.lastPlaytest.playtestId || recentScenePlaytest) && (
                      <div className="rounded-xl border border-sp-border bg-sp-muted p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-medium text-sp-subdued">最近场景试玩</div>
                            <div className="mt-1 font-mono text-[11px] text-sp-subdued">
                              {selectedScene.lastPlaytest.playtestId || recentScenePlaytest?.id}
                            </div>
                          </div>
                          <span className="rounded-full border border-sp-border bg-sp-surface px-2 py-0.5 text-[11px] text-sp-subdued">
                            {selectedScene.lastPlaytest.status || recentScenePlaytest?.status}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 text-xs leading-5 text-sp-subdued md:grid-cols-2">
                          <div>
                            <span>Session</span>
                            <strong className="ml-2 font-medium text-sp-text">
                              {selectedScene.lastPlaytest.sessionId || recentScenePlaytest?.sessionId || "待回收"}
                            </strong>
                          </div>
                          <div>
                            <span>场景 / 角色</span>
                            <strong className="ml-2 font-medium text-sp-text">
                              {selectedScene.lastPlaytest.sceneCount || recentScenePlaytest?.sceneCount || 0} /{" "}
                              {selectedScene.lastPlaytest.characterCount || recentScenePlaytest?.characterCount || 0}
                            </strong>
                          </div>
                        </div>
                        {(selectedScene.lastPlaytest.summary || recentScenePlaytest?.summary) && (
                          <p className="mt-3 line-clamp-4 rounded-lg border border-sp-border bg-sp-surface p-3 text-xs leading-5 text-sp-subdued">
                            {selectedScene.lastPlaytest.summary || recentScenePlaytest?.summary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-sp-border bg-sp-muted p-5 text-sm leading-6 text-sp-subdued">
                    还没有可编辑的故事结构。点击新增幕开始规划。
                  </div>
                )}
              </div>
            </Section>
            )}

            <Section
              title="互动策略"
              description="控制玩家怎么参与故事。自由输入已经硬生效；玩法、选项和分支会进入生成约束。"
              assistantTarget="interaction"
              onAssistant={openAssistantForSection}
              assistantLoading={Boolean(assistantLoadingAction)}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-medium text-sp-subdued">玩法模式 · 生成约束</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {playModeOptions.map((option) => (
                      <OptionButton
                        key={option.value}
                        active={project.interaction.playMode === option.value}
                        onClick={() => updateInteraction({ playMode: option.value })}
                      >
                        {option.label}
                      </OptionButton>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-sp-subdued">选项密度 · 生成约束</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {choiceDensityOptions.map((option) => (
                      <OptionButton
                        key={option.value}
                        active={project.interaction.choiceDensity === option.value}
                        onClick={() => updateInteraction({ choiceDensity: option.value })}
                      >
                        {option.label}
                      </OptionButton>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-sp-subdued">分支策略 · 生成约束</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {branchingModeOptions.map((option) => (
                      <OptionButton
                        key={option.value}
                        active={project.interaction.branchingMode === option.value}
                        onClick={() => updateInteraction({ branchingMode: option.value })}
                      >
                        {option.label}
                      </OptionButton>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-sp-subdued">自由输入 · 硬生效</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {freeformInputModeOptions.map((option) => (
                      <OptionButton
                        key={option.value}
                        active={project.interaction.freeformInputMode === option.value}
                        onClick={() =>
                          updateInteraction({
                            freeformInputMode: option.value,
                            freeformInput: option.value !== "off",
                          })
                        }
                      >
                        {option.label}
                      </OptionButton>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-sp-subdued">
                    仅试玩表示创作者测试时可自由输入，发布到首页后玩家只看到选项。
                  </p>
                </div>
                <Field label="选择风格">
                  <TextArea
                    value={project.interaction.choiceStyle}
                    onChange={(value) => updateInteraction({ choiceStyle: value })}
                    placeholder="例如：关键选择推动关系变化，不做无效选项。"
                    rows={4}
                  />
                </Field>
                <Field label="分支备注">
                  <TextArea
                    value={project.interaction.branchNotes}
                    onChange={(value) => updateInteraction({ branchNotes: value })}
                    placeholder="哪些选择会造成真实分支？哪些只改变情绪和信息？"
                    rows={4}
                  />
                </Field>
              </div>
            </Section>

            <Section
              title="视觉策略"
              description="控制作品的视觉方向和生成成本。封面、首场图和角色参考图统一在资产库维护。"
              assistantTarget="visual"
              onAssistant={openAssistantForSection}
              assistantLoading={Boolean(assistantLoadingAction)}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="text-[11px] font-medium text-sp-subdued">视觉生成频率 · 生成偏好</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {visualGenerationModeOptions.map((option) => (
                      <OptionButton
                        key={option.value}
                        active={project.interaction.visualGenerationMode === option.value}
                        onClick={() => updateInteraction({ visualGenerationMode: option.value })}
                      >
                        {option.label}
                      </OptionButton>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-sp-subdued">
                    当前会进入运行时策略和生成上下文；是否真正跳过后续场景生图，还需要下一步接入引擎级图片调度。
                  </p>
                </div>
                <Field label="视觉风格提示">
                  <TextArea
                    value={project.visual.stylePrompt}
                    onChange={(value) => updateVisual({ stylePrompt: value })}
                    placeholder="用于首图、封面和后续场景图生成。"
                    rows={4}
                  />
                </Field>
                <div className="rounded-xl border border-sp-border bg-sp-muted p-4 text-xs leading-5 text-sp-subdued">
                  <div className="text-sm font-semibold text-sp-text">资产入口</div>
                  <p className="mt-2">
                    封面图、首场图和主体角色参考图已经移到资产库。发布预览和首场生成会优先读取这些资产。
                  </p>
                </div>
              </div>
            </Section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <Section title="分类">
              <div className="space-y-5">
                <div>
                  <div className="text-[11px] font-medium text-sp-subdued">类型</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {genreOptions.map((genre) => (
                      <OptionButton
                        key={genre}
                        active={project.genres.includes(genre)}
                        onClick={() =>
                          updateProject({ genres: toggleValue(project.genres, genre) })
                        }
                      >
                        {genre}
                      </OptionButton>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-sp-subdued">情绪</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {moodOptions.map((mood) => (
                      <OptionButton
                        key={mood}
                        active={project.moods.includes(mood)}
                        onClick={() => updateProject({ moods: toggleValue(project.moods, mood) })}
                      >
                        {mood}
                      </OptionButton>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="工程状态">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-sp-subdued">生成状态</span>
                  <strong className="font-semibold text-sp-text">{project.generation.status}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-sp-subdued">发布状态</span>
                  <strong className="font-semibold text-sp-text">{project.publish.status}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-sp-subdued">发布 SKU</span>
                  <strong className="font-semibold text-sp-text">{project.publish.skuId || "未绑定"}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-sp-subdued">发布同步</span>
                  <strong className="font-semibold text-sp-text">
                    {publishSyncLabel}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-sp-subdued">更新时间</span>
                  <strong className="font-semibold text-sp-text">
                    {new Date(project.updatedAt).toLocaleString("zh-CN")}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-sp-subdued">试玩记录</span>
                  <strong className="font-semibold text-sp-text">{project.playtests.length}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-sp-subdued">最近试玩</span>
                  <strong className="font-semibold text-sp-text">
                    {project.playtests[0]
                      ? new Date(project.playtests[0].createdAt).toLocaleString("zh-CN")
                      : "暂无"}
                  </strong>
                </div>
              </div>
            </Section>

            <Section
              title="发布预览"
              description="这里按当前工程内容预览首页卡片，不需要先发布。"
            >
              <div className="overflow-hidden rounded-xl border border-sp-border bg-sp-muted">
                <div className="relative aspect-[4/3] bg-sp-surface">
                  <img
                    src={publishPreview.cover}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-sp-surface/90 px-2 py-0.5 text-[11px] font-medium text-sp-text shadow-sm">
                      {publishPreview.source}
                    </span>
                    <span className="rounded-full bg-sp-accent px-2 py-0.5 text-[11px] font-medium text-white shadow-sm">
                      {publishPreview.audience}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 font-serif text-xl font-semibold leading-tight text-sp-text">
                    {publishPreview.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-sp-subdued">
                    {publishPreview.logline}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(publishPreview.tags.length > 0 ? publishPreview.tags : ["未分类"]).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-sp-border bg-sp-surface px-2 py-0.5 text-[11px] text-sp-subdued"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-sp-border pt-3 text-xs text-sp-subdued">
                    <span>{publishPreview.runtime}</span>
                    <span>{publishSyncLabel}</span>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="发布前检查" description="这些字段决定首页展示和进入 /play 后的首场生成质量。">
              <div className="space-y-2">
                {publishChecks.map((item) => (
                  <div
                    key={item.label}
                    className={
                      "rounded-xl border px-3 py-2 " +
                      (item.passed
                        ? "border-sp-border bg-sp-muted"
                        : item.required
                          ? "border-sp-accent bg-sp-accentSoft"
                          : "border-sp-border bg-sp-surface")
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-sp-text">{item.label}</span>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                          (item.passed
                            ? "bg-sp-surface text-sp-subdued"
                            : item.required
                              ? "bg-sp-accent text-white"
                              : "bg-sp-muted text-sp-subdued")
                        }
                      >
                        {item.passed ? "已就绪" : item.required ? "必填" : "建议"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-sp-subdued">{item.detail}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="固定剧情包" description="玩家发布后会优先体验这里固定下来的试玩内容，再进入 AI 续写。">
              {project.fixedRuntimePackages.length > 0 ? (
                <div className="space-y-3">
                  {project.fixedRuntimePackages.slice(0, 3).map((pkg) => (
                    <div key={pkg.id} className="rounded-xl border border-sp-border bg-sp-muted p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-sp-text">{pkg.title}</div>
                          <div className="mt-1 font-mono text-[11px] text-sp-subdued">{pkg.id}</div>
                        </div>
                        <span className="rounded-full border border-sp-border bg-sp-surface px-2 py-0.5 text-[11px] text-sp-subdued">
                          {pkg.status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-sp-subdued">
                        <span>{pkg.sceneCount} 场</span>
                        <span>{pkg.beatCount} beat</span>
                        <span>{pkg.imageCount} 图</span>
                      </div>
                      {pkg.summary && (
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-sp-subdued">{pkg.summary}</p>
                      )}
                    </div>
                  ))}
                  <p className="text-xs leading-5 text-sp-subdued">
                    重新发布后，首页玩家会优先进入最新 ready / published 固定剧情包。
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-sp-border bg-sp-muted p-4 text-sm leading-6 text-sp-subdued">
                  暂无固定剧情包。完成一次试玩后，在试玩记录中点击“固定为剧情包”。
                </div>
              )}
            </Section>

            <Section title="试玩记录" description="优先显示当前选中场景的试玩构建，后续会在这里接收试玩结果。">
              {visiblePlaytests.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {visiblePlaytests.slice(0, 5).map((playtest, index) => {
                      const active = selectedPlaytest?.id === playtest.id;
                      return (
                        <button
                          key={playtest.id}
                          type="button"
                          onClick={() => setSelectedPlaytestId(playtest.id)}
                          className={
                            "w-full rounded-xl border px-3 py-2 text-left transition-colors " +
                            (active
                              ? "border-sp-accent bg-sp-accentSoft"
                              : "border-sp-border bg-sp-muted hover:border-sp-accent")
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-sp-text">
                              场景试玩 #{visiblePlaytests.length - index}
                            </span>
                            <span className="rounded-full border border-sp-border bg-sp-surface px-2 py-0.5 text-[11px] text-sp-subdued">
                              {playtest.status}
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-sp-subdued">
                            {playtest.id}
                          </div>
                          <div className="mt-1 text-xs text-sp-subdued">
                            {new Date(playtest.createdAt).toLocaleString("zh-CN")}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedPlaytest && (
                    <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] smallcaps text-sp-subdued">Selected Playtest</div>
                        <span className="text-xs text-sp-subdued">
                          warnings {selectedPlaytest.warnings.length}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-xs leading-5 text-sp-subdued">
                        <div className="flex justify-between gap-3">
                          <span>来源更新时间</span>
                          <strong className="font-medium text-sp-text">
                            {selectedPlaytest.sourceProjectUpdatedAt
                              ? new Date(selectedPlaytest.sourceProjectUpdatedAt).toLocaleString("zh-CN")
                              : "未记录"}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Session</span>
                          <strong className="font-medium text-sp-text">
                            {selectedPlaytest.sessionId || "待回收"}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>来源结构</span>
                          <strong className="truncate font-medium text-sp-text">
                            {selectedPlaytest.sourceSceneId || selectedPlaytest.sourceActId || "未记录"}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>场景 / 角色</span>
                          <strong className="font-medium text-sp-text">
                            {selectedPlaytest.sceneCount || 0} / {selectedPlaytest.characterCount || 0}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>可固定场景</span>
                          <strong className="font-medium text-sp-text">
                            {selectedPlaytest.recordedHistory.length}
                          </strong>
                        </div>
                        {selectedPlaytest.firstSceneKey && (
                          <div className="flex justify-between gap-3">
                            <span>首场景</span>
                            <strong className="truncate font-medium text-sp-text">
                              {selectedPlaytest.firstSceneKey}
                            </strong>
                          </div>
                        )}
                        <div className="flex justify-between gap-3">
                          <span>输入长度</span>
                          <strong className="font-medium text-sp-text">
                            {selectedPlaytest.startRequest.worldSetting.length} 字
                          </strong>
                        </div>
                      </div>

                      {selectedPlaytest.summary && (
                        <div className="mt-3 rounded-lg border border-sp-border bg-sp-surface p-2 text-xs leading-5 text-sp-subdued">
                          <div className="mb-1 font-medium text-sp-text">试玩回收摘要</div>
                          <p className="line-clamp-4">{selectedPlaytest.summary}</p>
                        </div>
                      )}

                      {selectedPlaytest.warnings.length > 0 && (
                        <div className="mt-3 rounded-lg border border-sp-accent bg-sp-accentSoft p-2 text-xs leading-5 text-sp-accent">
                          {selectedPlaytest.warnings.map((warning) => warning.message).join("；")}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => createFixedRuntimeFromPlaytest(selectedPlaytest.id)}
                        disabled={
                          fixedRuntimeState === "creating" ||
                          selectedPlaytest.recordedHistory.length === 0 ||
                          saveState === "saving"
                        }
                        className="mt-3 flex w-full items-center justify-between gap-3 rounded-lg border border-sp-accent bg-sp-accentSoft px-3 py-2 text-left text-xs font-semibold text-sp-accent transition-colors hover:bg-sp-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>
                          {fixedRuntimeState === "creating" ? "固定中" : "固定为剧情包"}
                        </span>
                        <i className="fa-solid fa-lock text-[11px]" />
                      </button>
                      {selectedPlaytest.recordedHistory.length === 0 && (
                        <p className="mt-2 text-xs leading-5 text-sp-subdued">
                          需要先完成一次试玩并等待记录回收，才可以固定剧情包。
                        </p>
                      )}

                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-medium text-sp-subdued transition-colors hover:text-sp-accent">
                          查看启动输入
                        </summary>
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-sp-border bg-sp-surface p-3 text-xs leading-5 text-sp-subdued">
                          <div className="font-medium text-sp-text">Style</div>
                          <p className="mt-1 whitespace-pre-wrap">{selectedPlaytest.startRequest.styleGuide}</p>
                          <div className="mt-3 font-medium text-sp-text">World</div>
                          <p className="mt-1 whitespace-pre-wrap">
                            {selectedPlaytest.startRequest.worldSetting}
                          </p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-sp-border bg-sp-muted p-4 text-sm leading-6 text-sp-subdued">
                  当前场景还没有试玩记录。点击“试玩此场景”后，这里会保留一次构建快照。
                </div>
              )}
            </Section>

            <Section title="发布与试玩">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={publishProject}
                  disabled={
                    publishState === "publishing" ||
                    publishState === "unpublishing" ||
                    saveState === "saving" ||
                    buildingPlaytest ||
                    publishBlockingIssues.length > 0
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-sp-accent bg-sp-accentSoft px-3 py-3 text-left text-sp-accent transition-colors hover:bg-sp-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {publishState === "publishing"
                        ? "发布中"
                        : publishState === "unpublishing"
                          ? "取消发布中"
                        : project.publish.status === "published"
                          ? "重新发布到首页"
                          : "发布到首页"}
                    </span>
                    <span className="mt-1 block text-xs leading-5 opacity-80">
                      生成可发现的 Story SKU，玩家点击后进入 /play。
                    </span>
                  </span>
                  <i className="fa-solid fa-paper-plane text-[12px]" />
                </button>
                {project.publish.status === "published" && (
                  <>
                    <Link
                      href={publishedHomepageHref}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-sp-border bg-sp-surface px-3 py-3 text-left text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                    >
                      <span>
                        <span className="block text-sm font-semibold">查看首页卡片</span>
                        <span className="mt-1 block text-xs leading-5 text-sp-subdued">
                          当前 SKU：{project.publish.skuId || "未绑定"}
                        </span>
                      </span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[12px]" />
                    </Link>
                    <Link
                      href={publishedManagementHref}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-sp-border bg-sp-surface px-3 py-3 text-left text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                    >
                      <span>
                        <span className="block text-sm font-semibold">查看发布管理</span>
                        <span className="mt-1 block text-xs leading-5 text-sp-subdued">
                          管理发布包装、资源和上下架。
                        </span>
                      </span>
                      <i className="fa-solid fa-layer-group text-[12px]" />
                    </Link>
                    <button
                      type="button"
                      onClick={unpublishProject}
                      disabled={publishState === "unpublishing" || publishState === "publishing" || saveState === "saving"}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-sp-accent/40 bg-sp-surface px-3 py-3 text-left text-sp-accent transition-colors hover:bg-sp-accentSoft disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          {publishState === "unpublishing" ? "取消发布中" : "取消发布"}
                        </span>
                        <span className="mt-1 block text-xs leading-5 opacity-80">
                          从首页移除发布产物，保留故事工程。
                        </span>
                      </span>
                      <i className="fa-solid fa-box-archive text-[12px]" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={startPlaytest}
                  disabled={buildingPlaytest || saveState === "saving"}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-sp-accent bg-sp-accent px-3 py-3 text-left text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {buildingPlaytest ? "准备试玩中" : "开始试玩"}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-white/80">
                      保存工程并用当前字段进入 /play。
                    </span>
                  </span>
                  <i className="fa-solid fa-play text-[12px]" />
                </button>
              </div>
            </Section>
          </aside>
        </section>
      </div>
    </main>
    <div className={assistantOpen ? "fixed inset-y-0 right-0 z-40 flex w-full max-w-[720px] flex-col items-stretch bg-sp-surface shadow-2xl shadow-black/25 sm:w-[min(720px,calc(100vw-3rem))]" : "fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3"}>
      {assistantOpen && (
        <div className="flex h-full flex-col overflow-hidden border-l border-sp-border bg-sp-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-sparkles text-sm text-sp-accent" />
              <h2 className="font-serif text-2xl font-semibold text-sp-text">创作助手</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-sp-subdued">
                选择一个板块，像聊天一样提出细微调整；结果会先生成预览，再由你确认回填。
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-sp-border bg-sp-muted px-3 py-1 text-[11px] font-medium text-sp-subdued">
                <i className="fa-solid fa-location-crosshairs text-[10px] text-sp-accent" />
                当前板块：{assistantTargetMeta.label}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAssistantOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sp-border bg-sp-muted text-sp-subdued hover:border-sp-accent hover:text-sp-accent"
            >
              <i className="fa-solid fa-xmark text-[12px]" />
            </button>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-medium text-sp-subdued">作用范围</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {assistantTargets.map((target) => (
                <button
                  key={target.value}
                  type="button"
                  onClick={() => setAssistantTarget(target.value)}
                  className={
                    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors " +
                    (assistantTarget === target.value
                      ? "border-sp-accent bg-sp-accentSoft text-sp-accent"
                      : "border-sp-border bg-sp-muted text-sp-subdued hover:border-sp-accent hover:text-sp-accent")
                  }
                >
                  {target.label}
                </button>
              ))}
            </div>
          </div>

          {assistantConversation.length > 0 && (
            <div className="mt-4 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-sp-border bg-sp-muted p-3">
              {assistantConversation.slice(-6).map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                  className={
                    "rounded-lg px-3 py-2 text-xs leading-5 " +
                    (message.role === "creator"
                      ? "ml-8 bg-sp-accent text-white"
                      : "mr-8 bg-sp-surface text-sp-text")
                  }
                >
                  {message.content}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-sp-border bg-sp-muted p-3">
            <textarea
              value={assistantInstruction}
              onChange={(event) => setAssistantInstruction(event.target.value)}
              rows={4}
              placeholder="和助手说要怎么微调，例如：更悬疑一点；保留女主设定，只补冲突；把世界规则写得更适合短篇试玩。"
              className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-sp-text outline-none placeholder:text-sp-subdued/70"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {["更悬疑", "更适合试玩", "更强互动", "缩短文案"].map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() =>
                      setAssistantInstruction((current) =>
                        current.trim() ? `${current.trim()}，${text}` : text,
                      )
                    }
                    className="inline-flex h-7 items-center rounded-full border border-sp-border bg-sp-surface px-2.5 text-[11px] font-medium text-sp-subdued hover:border-sp-accent hover:text-sp-accent"
                  >
                    {text}
                  </button>
                ))}
              </div>
              {assistantConversation.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAssistantConversation([]);
                    setAssistantResult(null);
                  }}
                  className="text-[11px] font-medium text-sp-subdued hover:text-sp-accent"
                >
                  清空对话
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => runAssistant("diagnose", assistantTarget)}
              disabled={Boolean(assistantLoadingAction)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sp-border bg-sp-muted text-sm font-semibold text-sp-text hover:border-sp-accent hover:text-sp-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-solid fa-stethoscope text-[12px]" />
              诊断
            </button>
            <button
              type="button"
              onClick={() => {
                const target = assistantTargets.find((item) => item.value === assistantTarget);
                runAssistant(target?.action ?? "expand-concept", assistantTarget);
              }}
              disabled={Boolean(assistantLoadingAction)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sp-accent text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-[12px]" />
              {assistantLoadingAction ? "生成中" : "发送并预览"}
            </button>
          </div>

          {assistantResult ? (
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-sp-border bg-sp-muted p-3">
              <div className="text-sm font-semibold text-sp-text">{assistantResult.summary}</div>
              {assistantResult.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-sp-text">诊断建议</div>
                  {assistantResult.suggestions.slice(0, 6).map((suggestion, index) => (
                    <div key={`${suggestion.field}-${index}`} className="rounded-lg bg-sp-surface px-3 py-2 text-xs leading-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-sp-subdued">{suggestion.field}</span>
                        <span className="text-[10px] font-semibold text-sp-accent">{suggestion.severity}</span>
                      </div>
                      <div className="mt-1 text-sp-text">{suggestion.message}</div>
                    </div>
                  ))}
                </div>
              )}
              {assistantPatchPreview.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-sp-text">回填预览</div>
                  {assistantPatchPreview.map((item) => (
                    <div key={item.field} className="rounded-lg bg-sp-surface px-3 py-2 text-xs leading-5">
                      <div className="font-mono text-[11px] text-sp-subdued">{item.field}</div>
                      <div className="mt-1 text-sp-subdued line-through">{item.before || "空"}</div>
                      <div className="mt-1 text-sp-text">{item.after || "空"}</div>
                    </div>
                  ))}
                </div>
              )}
              {assistantResult.patchNotes.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-sp-text">修改理由</div>
                  {assistantResult.patchNotes.slice(0, 6).map((note, index) => (
                    <div key={`${note.field}-${index}`} className="rounded-lg bg-sp-surface px-3 py-2 text-xs leading-5">
                      <div className="font-mono text-[11px] text-sp-subdued">{note.field}</div>
                      <div className="mt-1 text-sp-text">{note.reason}</div>
                    </div>
                  ))}
                </div>
              )}
              {assistantPatchPreview.length === 0 && assistantResult.nextActions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-sp-text">下一步</div>
                  {assistantResult.nextActions.slice(0, 6).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-lg bg-sp-surface px-3 py-2 text-xs leading-5 text-sp-text">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-sp-border bg-sp-muted p-6 text-center text-sm leading-6 text-sp-subdued">
              选择一个板块并生成建议。结果会先显示在这里，不会自动覆盖当前工程。
            </div>
          )}
          {assistantResult && assistantPatchPreview.length > 0 && (
            <div className="mt-3 border-t border-sp-border pt-3">
              <button
                type="button"
                onClick={applyAssistantPatch}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sp-accent text-sm font-semibold text-white hover:opacity-90"
              >
                <i className="fa-solid fa-check text-[12px]" />
                一键回填到当前草稿
              </button>
              <p className="mt-2 text-center text-[11px] leading-5 text-sp-subdued">
                回填只更新当前草稿，仍需要点击保存工程。
              </p>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setAssistantOpen((current) => !current)}
        className={(assistantOpen ? "hidden " : "inline-flex ") + "h-12 items-center gap-2 rounded-full bg-sp-accent px-5 text-sm font-semibold text-white shadow-xl shadow-black/20 transition-opacity hover:opacity-90"}
      >
        <i className="fa-solid fa-sparkles text-[13px]" />
        创作助手
      </button>
    </div>
    {settingsOpen && (
      <SettingsModal
        initialTab="models"
        initialVisionClickEnabled={visionClickEnabled}
        onClose={() => setSettingsOpen(false)}
        onSaved={(settings) => {
          setVisionClickEnabled(settings.visionClickEnabled);
          setNotice("模型配置已保存，可以重新点击开始试玩。");
          setSaveState("idle");
        }}
      />
    )}
    {assetGenerator.open && assetGenerator.target && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-sp-border bg-sp-surface shadow-2xl shadow-black/25">
          <div className="flex items-start justify-between gap-3 border-b border-sp-border p-5">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-sp-text">
                {assetGenerator.target.kind === "cover"
                  ? "生成封面图"
                  : assetGenerator.target.kind === "first-scene"
                    ? "生成首场图"
                    : "生成角色参考图"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-sp-subdued">
                生成结果会先预览，点击回填后才写入当前草稿。
              </p>
            </div>
            <button
              type="button"
              onClick={closeAssetGenerator}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sp-border bg-sp-muted text-sp-subdued hover:border-sp-accent hover:text-sp-accent"
            >
              <i className="fa-solid fa-xmark text-[12px]" />
            </button>
          </div>

          <div className="grid max-h-[calc(90vh-82px)] gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <Field label="生成提示词">
                <TextArea
                  value={assetGenerator.prompt}
                  onChange={(value) =>
                    setAssetGenerator((current) => ({ ...current, prompt: value }))
                  }
                  placeholder="描述你想生成的画面。"
                  rows={10}
                />
              </Field>
              {assetGenerator.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                  {assetGenerator.error}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={generateAssetImage}
                  disabled={assetGenerator.loading || !assetGenerator.prompt.trim()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-[12px]" />
                  {assetGenerator.loading ? "生成中" : "开始生成"}
                </button>
                {assetGenerator.resultUrl && (
                  <button
                    type="button"
                    onClick={applyGeneratedAsset}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sp-border bg-sp-muted px-4 text-sm font-semibold text-sp-text hover:border-sp-accent hover:text-sp-accent"
                  >
                    <i className="fa-solid fa-check text-[12px]" />
                    回填到草稿
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="overflow-hidden rounded-xl border border-sp-border bg-sp-muted">
                {assetGenerator.resultUrl ? (
                  <img
                    src={assetGenerator.resultUrl}
                    alt=""
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center p-6 text-center text-sm leading-6 text-sp-subdued">
                    {assetGenerator.loading ? "正在生成图片..." : "生成后会在这里预览"}
                  </div>
                )}
              </div>
              {assetGenerator.resultUuid && (
                <div className="mt-2 truncate font-mono text-[11px] text-sp-subdued">
                  {assetGenerator.resultUuid}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
