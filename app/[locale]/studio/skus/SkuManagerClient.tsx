"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StorySku, StorySkuGender } from "@/lib/storySku/manifest";
import {
  createStorySkuDraftMap,
  createStorySkuDraft,
  isStorySkuDraftDirty,
  mergeStoredStorySkuDrafts,
  normalizeDraftTags,
  pickDirtyStorySkuDrafts,
  validateStorySkuDraft,
  type StorySkuDraft,
  type StorySkuDraftIssue,
} from "@/lib/storySku/draft";
import {
  storySkuContentWarningOptions,
  storySkuGenreOptions,
  storySkuInteractionOptions,
  storySkuMoodOptions,
  storySkuStructureOptions,
  storySkuVisualStyleOptions,
} from "@/lib/storySku/taxonomy";

type ResourceFilter = "all" | "missing-cover" | "missing-first-act" | "missing-first-scene";
type GenreFilter = "all" | StorySkuDraft["genres"][number];

type SkuManagerClientProps = {
  skus: StorySku[];
  locale: string;
};

const genderLabels: Record<StorySkuGender, string> = {
  male: "男性向",
  female: "女性向",
};

const sourceLabels: Record<StorySku["publish"]["source"], string> = {
  preset: "系统预设",
  creator: "创作者发布",
};

const SKU_DRAFT_STORAGE_KEY = "storyplay:studio:sku-drafts:v1";
const SKU_DRAFT_API = "/api/studio/skus/drafts";

function studioRequestErrorMessage(response: Response, fallback?: string) {
  if (response.status === 401) return "请先登录，再继续使用创作后台。";
  if (response.status === 403) return "当前账号没有权限管理这个发布作品。";
  return fallback || "操作失败，请稍后重试。";
}

function coverForSku(sku: StorySku) {
  return sku.assets.cover ?? `/home/${sku.id}.webp`;
}

function coverForDraft(draft: StorySkuDraft, sku: StorySku) {
  return draft.cover.trim() || coverForSku(sku);
}

function resourceIssues(sku: StorySku) {
  const issues: string[] = [];
  if (!sku.assets.cover) issues.push("缺封面");
  if (!sku.firstAct.zh) issues.push("缺首幕");
  if (!sku.assets.firstScene) issues.push("缺首图");
  return issues;
}

function FieldEditor({
  label,
  value,
  onChange,
  multiline,
  type = "text",
  issues = [],
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: "text" | "number";
  issues?: StorySkuDraftIssue[];
}) {
  const hasError = issues.some((issue) => issue.severity === "error");
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-sp-subdued">{label}</span>
      {multiline ? (
        <textarea
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className={
            "mt-1.5 w-full resize-none rounded-xl border bg-sp-muted px-3 py-2 text-sm leading-6 text-sp-text outline-none transition-colors focus:border-sp-accent " +
            (hasError ? "border-sp-accent" : "border-sp-border")
          }
        />
      ) : (
        <input
          type={type}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className={
            "mt-1.5 h-10 w-full rounded-xl border bg-sp-muted px-3 text-sm text-sp-text outline-none transition-colors focus:border-sp-accent " +
            (hasError ? "border-sp-accent" : "border-sp-border")
          }
        />
      )}
      {issues.length > 0 && (
        <span className="mt-1.5 block text-xs leading-5 text-sp-subdued">
          {issues.map((issue) => issue.message).join("；")}
        </span>
      )}
    </label>
  );
}

function FilterButton({
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
          ? "border-sp-accent bg-sp-accent text-white"
          : "border-sp-border bg-sp-surface text-sp-subdued hover:border-sp-accent hover:text-sp-accent")
      }
    >
      {children}
    </button>
  );
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  multiple,
  issues = [],
}: {
  label: string;
  options: readonly T[];
  value: T | T[];
  onChange: (value: T | T[]) => void;
  multiple?: boolean;
  issues?: StorySkuDraftIssue[];
}) {
  const selectedValues = Array.isArray(value) ? value : [value];
  const hasError = issues.some((issue) => issue.severity === "error");

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-sp-subdued">{label}</span>
        {issues.length > 0 && (
          <span className={hasError ? "text-[11px] text-sp-accent" : "text-[11px] text-sp-subdued"}>
            {issues.map((issue) => issue.message).join("；")}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                if (!multiple) {
                  onChange(option);
                  return;
                }

                const next = selected
                  ? selectedValues.filter((item) => item !== option)
                  : [...selectedValues, option];
                onChange(next);
              }}
              className={
                "inline-flex h-8 items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors " +
                (selected
                  ? "border-sp-accent bg-sp-accentSoft text-sp-accent"
                  : "border-sp-border bg-sp-muted text-sp-subdued hover:border-sp-accent hover:text-sp-accent")
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

export function SkuManagerClient({ skus, locale }: SkuManagerClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<"all" | StorySkuGender>("all");
  const [genreFilter, setGenreFilter] = useState<GenreFilter>("all");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");
  const [selectedId, setSelectedId] = useState(skus[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, StorySkuDraft>>(() => createStorySkuDraftMap(skus));
  const [draftStorageReady, setDraftStorageReady] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [deletingSkuId, setDeletingSkuId] = useState("");
  const [importingSkuId, setImportingSkuId] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [removedSkuIds, setRemovedSkuIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function restoreDrafts() {
      try {
        let restoredDrafts: Record<string, StorySkuDraft> | null = null;
        let restoredFrom = "";

        try {
          const response = await fetch(SKU_DRAFT_API, { cache: "no-store" });
          if (response.ok) {
            const data = (await response.json()) as { drafts?: unknown };
            restoredDrafts = mergeStoredStorySkuDrafts(skus, data.drafts);
            restoredFrom = "服务端草稿";
          }
        } catch {
          // Local browser drafts remain a fallback when the dev API is unavailable.
        }

        if (!restoredDrafts) {
          const rawDrafts = window.localStorage.getItem(SKU_DRAFT_STORAGE_KEY);
          if (rawDrafts) {
            restoredDrafts = mergeStoredStorySkuDrafts(skus, JSON.parse(rawDrafts));
            restoredFrom = "本机浏览器草稿";
          }
        }

        if (!cancelled && restoredDrafts) {
          setDrafts(restoredDrafts);

          const restoredCount = Object.keys(pickDirtyStorySkuDrafts(skus, restoredDrafts)).length;
          if (restoredCount > 0) {
            setSaveNotice(`已恢复${restoredFrom} ${restoredCount} 条。`);
          }
        }
      } catch {
        if (!cancelled) setSaveNotice("草稿读取失败，已使用 manifest 默认值。");
      } finally {
        if (!cancelled) setDraftStorageReady(true);
      }
    }

    restoreDrafts();
    return () => {
      cancelled = true;
    };
  }, [skus]);

  useEffect(() => {
    if (!draftStorageReady) return;

    try {
      const dirtyDrafts = pickDirtyStorySkuDrafts(skus, drafts);
      if (Object.keys(dirtyDrafts).length > 0) {
        window.localStorage.setItem(SKU_DRAFT_STORAGE_KEY, JSON.stringify(dirtyDrafts));
      } else {
        window.localStorage.removeItem(SKU_DRAFT_STORAGE_KEY);
      }
    } catch {
      setSaveNotice("本机草稿保存失败，请检查浏览器存储权限。");
    }
  }, [draftStorageReady, drafts, skus]);

  const visibleSkus = useMemo(
    () => skus.filter((sku) => !removedSkuIds.includes(sku.id)),
    [removedSkuIds, skus],
  );
  const selectedSku = visibleSkus.find((sku) => sku.id === selectedId) ?? visibleSkus[0];
  const selectedDraft = selectedSku ? drafts[selectedSku.id] : undefined;
  const selectedIssues = selectedDraft ? validateStorySkuDraft(selectedDraft) : [];
  const selectedDirty =
    Boolean(selectedSku && selectedDraft && isStorySkuDraftDirty(selectedSku, selectedDraft));
  const issueMap = selectedIssues.reduce<Record<string, StorySkuDraftIssue[]>>((acc, issue) => {
    acc[issue.field] = [...(acc[issue.field] ?? []), issue];
    return acc;
  }, {});

  const dirtyCount = visibleSkus.filter((sku) => {
    const draft = drafts[sku.id];
    return draft ? isStorySkuDraftDirty(sku, draft) : false;
  }).length;

  const updateDraft = (id: string, patch: Partial<StorySkuDraft>) => {
    setSaveNotice("");
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id]!,
        ...patch,
      },
    }));
  };

  const resetDraft = async (sku: StorySku) => {
    setDrafts((current) => ({
      ...current,
      [sku.id]: createStorySkuDraft(sku),
    }));
    try {
      await fetch(`${SKU_DRAFT_API}/${sku.id}`, { method: "DELETE" });
      setSaveNotice("已重置当前 SKU 草稿。");
    } catch {
      setSaveNotice("已重置本机草稿；服务端草稿清理失败。");
    }
  };

  const resetAllDrafts = async () => {
    setDrafts(createStorySkuDraftMap(skus));
    window.localStorage.removeItem(SKU_DRAFT_STORAGE_KEY);
    try {
      await fetch(SKU_DRAFT_API, { method: "DELETE" });
      setSaveNotice("已重置全部草稿。");
    } catch {
      setSaveNotice("已重置本机草稿；服务端草稿清理失败。");
    }
  };

  const saveSelectedDraft = async () => {
    if (!selectedDraft || !selectedDirty) return;

    setSavingDraft(true);
    try {
      const response = await fetch(SKU_DRAFT_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: selectedDraft }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setSaveNotice(studioRequestErrorMessage(response));
          return;
        }
        setSaveNotice(data.error ? `保存失败：${data.error}` : "保存失败，请稍后重试。");
        return;
      }

      setSaveNotice("已保存到发布包装草稿；尚未写入正式发布存储。");
    } catch {
      setSaveNotice("保存接口不可用，已保留在本机浏览器草稿。");
    } finally {
      setSavingDraft(false);
    }
  };

  const deleteSelectedSku = async () => {
    if (!selectedSku || selectedSku.publish.source !== "creator") return;

    const confirmed = window.confirm(
      `确定删除已发布作品「${selectedSku.title}」吗？这只会删除发布产物，故事工程会保留并回到未发布状态。`,
    );
    if (!confirmed) return;

    setDeletingSkuId(selectedSku.id);
    setSaveNotice("");

    try {
      const response = await fetch(`/api/studio/skus/${encodeURIComponent(selectedSku.id)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setSaveNotice(studioRequestErrorMessage(response));
          return;
        }
        setSaveNotice(data.error ? `删除失败：${data.error}` : "删除失败，请稍后重试。");
        return;
      }

      setRemovedSkuIds((current) => [...current, selectedSku.id]);
      setDrafts((current) => {
        const { [selectedSku.id]: _deleted, ...next } = current;
        return next;
      });

      const nextSku = filteredSkus.find((sku) => sku.id !== selectedSku.id);
      setSelectedId(nextSku?.id ?? "");
      setSaveNotice("已删除发布作品；源故事工程已保留，可重新发布。");
    } catch {
      setSaveNotice("删除接口不可用，请稍后重试。");
    } finally {
      setDeletingSkuId("");
    }
  };

  const importSelectedPreset = async () => {
    if (!selectedSku || selectedSku.publish.source !== "preset") return;

    setImportingSkuId(selectedSku.id);
    setSaveNotice("");

    try {
      const response = await fetch(
        `/api/studio/skus/${encodeURIComponent(selectedSku.id)}/import-project`,
        { method: "POST" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        project?: { id: string };
        error?: string;
      };

      if (!response.ok || !data.project) {
        if (response.status === 401 || response.status === 403) {
          setSaveNotice(studioRequestErrorMessage(response));
          return;
        }
        setSaveNotice(data.error ? `复制失败：${data.error}` : "复制失败，请稍后重试。");
        return;
      }

      router.push(localePath(`/studio/projects/${data.project.id}`, locale));
    } catch {
      setSaveNotice("复制接口不可用，请稍后重试。");
    } finally {
      setImportingSkuId("");
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSkus = visibleSkus.filter((sku) => {
    const draft = drafts[sku.id];
    if (gender !== "all" && sku.gender !== gender) return false;
    if (genreFilter !== "all" && !draft?.genres.includes(genreFilter)) return false;
    if (resourceFilter === "missing-cover" && sku.assets.cover) return false;
    if (resourceFilter === "missing-first-act" && sku.firstAct.zh) return false;
    if (resourceFilter === "missing-first-scene" && sku.assets.firstScene) return false;
    if (!normalizedQuery) return true;
    return [
      sku.id,
      sku.title,
      sku.logline,
      sku.synopsis,
      sku.genreTagsRaw,
      ...sku.tags,
      ...(draft?.genres ?? []),
      ...(draft?.moods ?? []),
      draft?.interaction ?? "",
      draft?.structure ?? "",
      draft?.visualStyle ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 rounded-2xl border border-sp-border bg-sp-surface shadow-sm shadow-black/[0.04]">
        <div className="border-b border-sp-border px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold text-sp-text">已发布作品</h2>
              <p className="mt-1 text-xs text-sp-subdued">
                包含创作者发布的 Story SKU 与系统预设故事
              </p>
            </div>
            <div className="flex flex-col gap-3 xl:items-end">
              <div className="relative w-full xl:w-80">
                <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-sp-subdued" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索标题、标签、ID"
                  className="h-10 w-full rounded-xl border border-sp-border bg-sp-muted pl-9 pr-3 text-sm text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterButton active={gender === "all"} onClick={() => setGender("all")}>
                  全部
                </FilterButton>
                <FilterButton active={gender === "male"} onClick={() => setGender("male")}>
                  男性向
                </FilterButton>
                <FilterButton active={gender === "female"} onClick={() => setGender("female")}>
                  女性向
                </FilterButton>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <FilterButton active={genreFilter === "all"} onClick={() => setGenreFilter("all")}>
              全部类型
            </FilterButton>
            {storySkuGenreOptions.map((genreOption) => (
              <FilterButton
                key={genreOption}
                active={genreFilter === genreOption}
                onClick={() => setGenreFilter(genreOption)}
              >
                {genreOption}
              </FilterButton>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterButton active={resourceFilter === "all"} onClick={() => setResourceFilter("all")}>
              全部资源
            </FilterButton>
            <FilterButton
              active={resourceFilter === "missing-cover"}
              onClick={() => setResourceFilter("missing-cover")}
            >
              缺封面
            </FilterButton>
            <FilterButton
              active={resourceFilter === "missing-first-act"}
              onClick={() => setResourceFilter("missing-first-act")}
            >
              缺首幕
            </FilterButton>
            <FilterButton
              active={resourceFilter === "missing-first-scene"}
              onClick={() => setResourceFilter("missing-first-scene")}
            >
              缺首图
            </FilterButton>
            <span className="inline-flex h-9 items-center text-xs text-sp-subdued">
              当前 {filteredSkus.length}/{visibleSkus.length}
            </span>
            {dirtyCount > 0 && (
              <>
                <span className="inline-flex h-9 items-center rounded-full border border-sp-accent bg-sp-accentSoft px-3 text-xs font-medium text-sp-accent">
                  包装草稿 {dirtyCount}
                </span>
                <button
                  type="button"
                  onClick={resetAllDrafts}
                  className="inline-flex h-9 items-center rounded-full border border-sp-border bg-sp-surface px-3 text-xs font-medium text-sp-subdued transition-colors hover:border-sp-accent hover:text-sp-accent"
                >
                  重置全部包装草稿
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed text-left text-sm">
            <thead className="border-b border-sp-border text-[10px] smallcaps text-sp-subdued">
              <tr>
                <th className="w-[34%] px-5 py-3 font-medium">作品</th>
                <th className="w-[20%] px-4 py-3 font-medium">分类</th>
                <th className="w-[12%] px-4 py-3 font-medium">Runtime</th>
                <th className="w-[14%] px-4 py-3 font-medium">资源</th>
                <th className="w-[10%] px-4 py-3 font-medium">状态</th>
                <th className="w-[10%] px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sp-border">
              {filteredSkus.map((sku) => {
                const issues = resourceIssues(sku);
                const selected = selectedSku?.id === sku.id;
                const draft = drafts[sku.id] ?? createStorySkuDraft(sku);
                return (
                  <tr
                    key={sku.id}
                    className={
                      "align-top transition-colors hover:bg-sp-muted/55 " +
                      (selected ? "bg-sp-muted/70" : "")
                    }
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedId(sku.id)}
                        className="flex w-full gap-3 text-left outline-none"
                      >
                        <img
                          src={coverForSku(sku)}
                          alt=""
                          className="h-20 w-16 rounded-lg border border-sp-border object-cover"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-mono text-xs text-sp-subdued">{sku.id}</span>
                            <span className="rounded-full bg-sp-accentSoft px-2 py-0.5 text-[11px] text-sp-accent">
                              {sku.audienceLabel}
                            </span>
                            <span className="rounded-full border border-sp-border px-2 py-0.5 text-[11px] text-sp-subdued">
                              {sourceLabels[sku.publish.source]}
                            </span>
                          </span>
                          <span className="mt-1 block font-serif text-lg font-semibold leading-tight text-sp-text">
                            {sku.title}
                          </span>
                          <span className="mt-1 line-clamp-2 block max-w-xl text-xs leading-5 text-sp-subdued">
                            {sku.logline || sku.synopsis}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-[190px] flex-wrap gap-1.5">
                        {draft.genres.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-sp-accentSoft px-2 py-0.5 text-[11px] text-sp-accent"
                          >
                            {tag}
                          </span>
                        ))}
                        {draft.moods.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-sp-border px-2 py-0.5 text-[11px] text-sp-subdued"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 line-clamp-2 text-[11px] text-sp-subdued">
                        {draft.structure} / {draft.visualStyle}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs leading-5 text-sp-subdued">
                      <div>{sku.runtimeSummary.beatsCount} beats</div>
                      <div>{sku.runtimeSummary.choicesCount} choices</div>
                      <div>{sku.runtimeSummary.charactersCount} characters</div>
                    </td>
                    <td className="px-4 py-4 text-xs leading-5 text-sp-subdued">
                      <div>首幕 {sku.firstAct.zh ? "已绑定" : "缺失"}</div>
                      <div>首图 {sku.assets.firstScene ? "已绑定" : "缺失"}</div>
                      <div>头像 {sku.assets.portraits.length + sku.assets.portraitsPortrait.length}</div>
                      {issues.length > 0 && (
                        <div className="mt-1 text-sp-accent">{issues.join(" / ")}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-sp-border bg-sp-muted px-2.5 py-1 text-xs text-sp-subdued">
                        <span className="h-1.5 w-1.5 rounded-full bg-sp-accent" />
                        <span className="truncate">{sku.publish.status}</span>
                      </div>
                      <div className="mt-2 text-xs text-sp-subdued">排序 {sku.curation.sortOrder}</div>
                      {drafts[sku.id] && isStorySkuDraftDirty(sku, drafts[sku.id]!) && (
                        <div className="mt-2 text-xs font-medium text-sp-accent">有包装草稿</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedId(sku.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-2.5 text-xs font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
                      >
                        <i className="fa-solid fa-sliders text-[11px]" />
                        查看
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSkus.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-sp-subdued">
                    没有匹配的发布作品。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="space-y-6">
        {selectedSku && selectedDraft ? (
          <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04]">
            <div className="flex items-start gap-4">
              <img
                src={coverForDraft(selectedDraft, selectedSku)}
                alt=""
                className="h-28 w-20 shrink-0 rounded-xl border border-sp-border object-cover"
              />
              <div className="min-w-0">
                <div className="font-mono text-xs text-sp-subdued">{selectedSku.id}</div>
                <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-sp-text">
                  {selectedSku.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-sp-accentSoft px-2 py-0.5 text-[11px] text-sp-accent">
                    {genderLabels[selectedSku.gender]}
                  </span>
                  <span className="rounded-full border border-sp-border px-2 py-0.5 text-[11px] text-sp-subdued">
                    {selectedDraft.status}
                  </span>
                  <span className="rounded-full border border-sp-border px-2 py-0.5 text-[11px] text-sp-subdued">
                    {sourceLabels[selectedSku.publish.source]}
                  </span>
                  {selectedDirty && (
                    <span className="rounded-full border border-sp-accent bg-sp-accentSoft px-2 py-0.5 text-[11px] text-sp-accent">
                      包装草稿
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-sp-border bg-sp-muted px-3 py-2 text-xs leading-5 text-sp-subdued">
              当前只调整发布包装草稿，不修改 StoryProject 源文件。正文、固定首场和剧情大纲请回到故事工程编辑。
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-sp-subdued">
              <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                <div className="text-[10px] smallcaps">来源</div>
                <div className="mt-1 font-medium text-sp-text">
                  {sourceLabels[selectedSku.publish.source]}
                </div>
              </div>
              <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                <div className="text-[10px] smallcaps">源工程</div>
                <div className="mt-1 truncate font-mono text-[11px] font-medium text-sp-text">
                  {selectedSku.publish.sourceProjectId ?? "无"}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <FieldEditor
                label="标题"
                value={selectedDraft.title}
                onChange={(value) => updateDraft(selectedSku.id, { title: value })}
                issues={issueMap.title}
              />
              <FieldEditor
                label="一句话卖点"
                value={selectedDraft.logline}
                onChange={(value) => updateDraft(selectedSku.id, { logline: value })}
                multiline
                issues={issueMap.logline}
              />
              <FieldEditor
                label="简介"
                value={selectedDraft.synopsis}
                onChange={(value) => updateDraft(selectedSku.id, { synopsis: value })}
                multiline
                issues={issueMap.synopsis}
              />
              <FieldEditor
                label="标签"
                value={selectedDraft.tagsText}
                onChange={(value) => updateDraft(selectedSku.id, { tagsText: value })}
                issues={issueMap.tagsText}
              />
              <OptionGroup
                label="主类型"
                options={storySkuGenreOptions}
                value={selectedDraft.genres}
                multiple
                onChange={(value) =>
                  updateDraft(selectedSku.id, { genres: value as StorySkuDraft["genres"] })
                }
                issues={issueMap.genres}
              />
              <OptionGroup
                label="情绪调性"
                options={storySkuMoodOptions}
                value={selectedDraft.moods}
                multiple
                onChange={(value) =>
                  updateDraft(selectedSku.id, { moods: value as StorySkuDraft["moods"] })
                }
                issues={issueMap.moods}
              />
              <OptionGroup
                label="互动强度"
                options={storySkuInteractionOptions}
                value={selectedDraft.interaction}
                onChange={(value) =>
                  updateDraft(selectedSku.id, {
                    interaction: value as StorySkuDraft["interaction"],
                  })
                }
              />
              <OptionGroup
                label="叙事结构"
                options={storySkuStructureOptions}
                value={selectedDraft.structure}
                onChange={(value) =>
                  updateDraft(selectedSku.id, { structure: value as StorySkuDraft["structure"] })
                }
              />
              <OptionGroup
                label="视觉风格"
                options={storySkuVisualStyleOptions}
                value={selectedDraft.visualStyle}
                onChange={(value) =>
                  updateDraft(selectedSku.id, {
                    visualStyle: value as StorySkuDraft["visualStyle"],
                  })
                }
              />
              <OptionGroup
                label="内容提示"
                options={storySkuContentWarningOptions}
                value={selectedDraft.contentWarnings}
                multiple
                onChange={(value) =>
                  updateDraft(selectedSku.id, {
                    contentWarnings: value as StorySkuDraft["contentWarnings"],
                  })
                }
              />
              <FieldEditor
                label="封面路径"
                value={selectedDraft.cover}
                onChange={(value) => updateDraft(selectedSku.id, { cover: value })}
                issues={issueMap.cover}
              />
              <FieldEditor
                label="首图路径"
                value={selectedDraft.firstScene}
                onChange={(value) => updateDraft(selectedSku.id, { firstScene: value })}
                issues={issueMap.firstScene}
              />
              <FieldEditor
                label="排序"
                value={selectedDraft.sortOrder}
                type="number"
                onChange={(value) =>
                  updateDraft(selectedSku.id, {
                    sortOrder: Number.isFinite(Number(value)) ? Number(value) : 0,
                  })
                }
                issues={issueMap.sortOrder}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-medium text-sp-subdued">推荐</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft(selectedSku.id, { featured: !selectedDraft.featured })
                    }
                    className={
                      "mt-1.5 inline-flex h-10 w-full items-center justify-center rounded-xl border text-sm font-semibold transition-colors " +
                      (selectedDraft.featured
                        ? "border-sp-accent bg-sp-accent text-white"
                        : "border-sp-border bg-sp-muted text-sp-subdued")
                    }
                  >
                    {selectedDraft.featured ? "已推荐" : "未推荐"}
                  </button>
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-sp-subdued">状态</span>
                  <select
                    value={selectedDraft.status}
                    onChange={(event) =>
                      updateDraft(selectedSku.id, {
                        status: event.target.value as StorySkuDraft["status"],
                      })
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-sp-border bg-sp-muted px-3 text-sm text-sp-text outline-none focus:border-sp-accent"
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-sp-border bg-sp-muted p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] smallcaps text-sp-subdued">校验状态</div>
                  <div className="mt-1 text-sm font-semibold text-sp-text">
                    {selectedIssues.filter((issue) => issue.severity === "error").length} errors /{" "}
                    {selectedIssues.filter((issue) => issue.severity === "warning").length} warnings
                  </div>
                </div>
                <div className="text-right text-xs text-sp-subdued">
                  标签 {normalizeDraftTags(selectedDraft.tagsText).length} / 类型{" "}
                  {selectedDraft.genres.length}
                </div>
              </div>
              {selectedIssues.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs leading-5 text-sp-subdued">
                  {selectedIssues.map((issue) => (
                    <li key={`${issue.field}-${issue.message}`}>
                      <span className={issue.severity === "error" ? "text-sp-accent" : ""}>
                        {issue.severity === "error" ? "错误" : "提醒"}：
                      </span>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-sp-subdued">
              <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                <div className="text-[10px] smallcaps">First Act</div>
                <div className="mt-1 font-medium text-sp-text">
                  {selectedSku.firstAct.zh ? "已绑定" : "缺失"}
                </div>
              </div>
              <div className="rounded-xl border border-sp-border bg-sp-muted p-3">
                <div className="text-[10px] smallcaps">First Scene</div>
                <div className="mt-1 font-medium text-sp-text">
                  {selectedSku.assets.firstScene ? "已绑定" : "缺失"}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={saveSelectedDraft}
                disabled={!selectedDirty || savingDraft}
                className={
                  "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white " +
                  (selectedDirty && !savingDraft ? "bg-sp-accent" : "cursor-not-allowed bg-sp-accent/50")
                }
              >
                <i className="fa-solid fa-floppy-disk text-[12px]" />
                {savingDraft ? "保存中" : "保存包装草稿"}
              </button>
              <button
                type="button"
                onClick={() => resetDraft(selectedSku)}
                disabled={!selectedDirty}
                className={
                  "inline-flex h-10 items-center justify-center rounded-xl border border-sp-border bg-sp-muted px-4 text-sm font-semibold " +
                  (selectedDirty ? "text-sp-text" : "cursor-not-allowed text-sp-subdued")
                }
              >
                重置
              </button>
            </div>
            {selectedSku.publish.source === "creator" && (
              <button
                type="button"
                onClick={deleteSelectedSku}
                disabled={deletingSkuId === selectedSku.id}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-sp-accent/40 bg-sp-surface px-4 text-sm font-semibold text-sp-accent transition-colors hover:bg-sp-accentSoft disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className="fa-solid fa-trash-can text-[12px]" />
                {deletingSkuId === selectedSku.id ? "删除中" : "删除已发布作品"}
              </button>
            )}
            {selectedSku.publish.source === "preset" && (
              <button
                type="button"
                onClick={importSelectedPreset}
                disabled={importingSkuId === selectedSku.id}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-sp-accent bg-sp-accentSoft px-4 text-sm font-semibold text-sp-accent transition-colors hover:bg-sp-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className="fa-solid fa-copy text-[12px]" />
                {importingSkuId === selectedSku.id ? "复制中" : "复制为故事工程"}
              </button>
            )}
            {saveNotice && (
              <div className="mt-3 text-xs leading-5 text-sp-subdued">{saveNotice}</div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-sp-border bg-sp-surface p-5 text-sm text-sp-subdued">
            请选择一个发布作品查看包装配置。
          </div>
        )}
      </aside>
    </div>
  );
}
