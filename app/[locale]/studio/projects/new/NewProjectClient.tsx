"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  StoryProject,
  StoryProjectAudience,
  StoryProjectCreateInput,
} from "@/lib/storyProject/types";

const genreOptions = ["恋爱", "悬疑", "奇幻", "都市", "校园", "职场", "科幻", "历史", "冒险", "成长"];
const moodOptions = ["甜", "虐", "紧张", "治愈", "暧昧", "爽感", "暗黑", "浪漫", "诡异"];

const audienceOptions: Array<{ value: StoryProjectAudience; label: string }> = [
  { value: "universal", label: "通用" },
  { value: "female", label: "女性向" },
  { value: "male", label: "男性向" },
];

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
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

export function NewProjectClient({ locale }: { locale: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [audience, setAudience] = useState<StoryProjectAudience>("universal");
  const [genres, setGenres] = useState<string[]>(["恋爱"]);
  const [moods, setMoods] = useState<string[]>(["浪漫"]);
  const [setting, setSetting] = useState("");
  const [tone, setTone] = useState("");
  const [protagonist, setProtagonist] = useState("");
  const [coreConflict, setCoreConflict] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const input: StoryProjectCreateInput = {
      title,
      logline,
      synopsis,
      audience,
      genres,
      moods,
      world: {
        setting,
        tone,
      },
      narrative: {
        protagonist,
        coreConflict,
      },
      visual: {
        stylePrompt: visualStyle,
      },
    };

    setSaving(true);
    try {
      const response = await fetch("/api/studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await response.json().catch(() => ({}))) as {
        project?: StoryProject;
        error?: string;
        issues?: Array<{ message: string }>;
      };

      if (!response.ok || !data.project) {
        const issueText = data.issues?.map((issue) => issue.message).join("；");
        setNotice(issueText || data.error || "创建失败，请检查输入内容。");
        return;
      }

      router.push(localePath(`/studio/projects/${data.project.id}`, locale));
      router.refresh();
    } catch {
      setNotice("创建接口不可用，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-sp-bg text-sp-text">
      <div className="mx-auto w-full max-w-5xl px-5 py-5 md:px-8 md:py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link
            href={localePath("/studio/projects", locale)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-4 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
          >
            <i className="fa-solid fa-arrow-left text-[12px]" />
            返回故事工程
          </Link>
          <Link
            href={localePath("/", locale)}
            className="font-serif text-lg font-semibold text-sp-text hover:text-sp-accent"
          >
            <span>Story</span>
            <span className="text-sp-play">Play</span>
          </Link>
        </div>

        <form
          onSubmit={submitProject}
          className="rounded-2xl border border-sp-border bg-sp-surface p-5 shadow-sm shadow-black/[0.04] md:p-7"
        >
          <div className="flex flex-col gap-4 border-b border-sp-border pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[10px] smallcaps text-sp-subdued">New StoryProject</div>
              <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-sp-text md:text-5xl">
                新建故事工程
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-sp-subdued md:text-[15px]">
                先收集最小创作骨架：故事命题、目标体验、世界观、主角和视觉方向。章节树、角色资产和试玩生成下一阶段继续补。
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-sp-accent px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-solid fa-floppy-disk text-[12px]" />
              {saving ? "创建中" : "创建工程"}
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-5">
              <Field label="工程标题">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：雨夜便利店的第七次重逢"
                  className="h-11 w-full rounded-xl border border-sp-border bg-sp-muted px-3 text-sm text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                />
              </Field>

              <Field label="一句话概念" hint="用于后续生成首幕、首页包装和试玩入口。">
                <textarea
                  value={logline}
                  onChange={(event) => setLogline(event.target.value)}
                  rows={3}
                  placeholder="你在一个不断重置的雨夜里，必须判断谁记得上一轮故事。"
                  className="w-full resize-none rounded-xl border border-sp-border bg-sp-muted px-3 py-2 text-sm leading-6 text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                />
              </Field>

              <Field label="故事简介">
                <textarea
                  value={synopsis}
                  onChange={(event) => setSynopsis(event.target.value)}
                  rows={5}
                  placeholder="补充主要关系、悬念、冲突和期望的玩家体验。"
                  className="w-full resize-none rounded-xl border border-sp-border bg-sp-muted px-3 py-2 text-sm leading-6 text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="世界观设定">
                  <textarea
                    value={setting}
                    onChange={(event) => setSetting(event.target.value)}
                    rows={4}
                    placeholder="故事发生在哪里？世界有什么规则？"
                    className="w-full resize-none rounded-xl border border-sp-border bg-sp-muted px-3 py-2 text-sm leading-6 text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                  />
                </Field>
                <Field label="视觉风格">
                  <textarea
                    value={visualStyle}
                    onChange={(event) => setVisualStyle(event.target.value)}
                    rows={4}
                    placeholder="电影感、日系轻小说、写实、国风、哥特等。"
                    className="w-full resize-none rounded-xl border border-sp-border bg-sp-muted px-3 py-2 text-sm leading-6 text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                  />
                </Field>
              </div>
            </section>

            <aside className="space-y-5">
              <div>
                <div className="text-[11px] font-medium text-sp-subdued">目标受众</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {audienceOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      active={audience === option.value}
                      onClick={() => setAudience(option.value)}
                    >
                      {option.label}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-sp-subdued">类型</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {genreOptions.map((genre) => (
                    <OptionButton
                      key={genre}
                      active={genres.includes(genre)}
                      onClick={() => setGenres((current) => toggleValue(current, genre))}
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
                      active={moods.includes(mood)}
                      onClick={() => setMoods((current) => toggleValue(current, mood))}
                    >
                      {mood}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <Field label="主角 / 玩家位置">
                <input
                  value={protagonist}
                  onChange={(event) => setProtagonist(event.target.value)}
                  placeholder="例如：刚搬来的夜班店员"
                  className="h-10 w-full rounded-xl border border-sp-border bg-sp-muted px-3 text-sm text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                />
              </Field>

              <Field label="核心冲突">
                <textarea
                  value={coreConflict}
                  onChange={(event) => setCoreConflict(event.target.value)}
                  rows={3}
                  placeholder="玩家必须解决什么冲突，或在什么关系中做选择？"
                  className="w-full resize-none rounded-xl border border-sp-border bg-sp-muted px-3 py-2 text-sm leading-6 text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                />
              </Field>

              <Field label="叙事调性">
                <input
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  placeholder="例如：暧昧、紧张、低饱和电影感"
                  className="h-10 w-full rounded-xl border border-sp-border bg-sp-muted px-3 text-sm text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
                />
              </Field>

              {notice && (
                <div className="rounded-xl border border-sp-accent bg-sp-accentSoft p-3 text-xs leading-5 text-sp-accent">
                  {notice}
                </div>
              )}
            </aside>
          </div>
        </form>
      </div>
    </main>
  );
}
