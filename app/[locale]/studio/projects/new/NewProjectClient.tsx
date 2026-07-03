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

export function NewProjectClient({ locale }: { locale: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [audience, setAudience] = useState<StoryProjectAudience>("universal");
  const [genres, setGenres] = useState<string[]>(["恋爱"]);
  const [moods, setMoods] = useState<string[]>(["浪漫"]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const input: StoryProjectCreateInput = {
      title,
      logline,
      audience,
      genres,
      moods,
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
        if (response.status === 401) {
          setNotice("请先登录，再创建故事工程。");
          return;
        }
        if (response.status === 403) {
          setNotice("当前账号没有权限创建或编辑这个故事工程。");
          return;
        }
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
      <div className="mx-auto w-full max-w-3xl px-5 py-5 md:px-8 md:py-8">
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
          <div className="border-b border-sp-border pb-5">
            <div className="text-[10px] smallcaps text-sp-subdued">New StoryProject</div>
            <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-sp-text md:text-5xl">
              新建故事
            </h1>
            <p className="mt-3 text-sm leading-7 text-sp-subdued md:text-[15px]">
              这里只收最小信息。创建后进入编辑页，再用右下角创作助手补世界观、角色、大纲、互动和视觉。
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="text-[11px] font-medium text-sp-subdued">故事标题</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：雨夜便利店的第七次重启"
                className="mt-1.5 h-11 w-full rounded-xl border border-sp-border bg-sp-muted px-3 text-sm text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-sp-subdued">一句话概念</span>
              <textarea
                value={logline}
                onChange={(event) => setLogline(event.target.value)}
                rows={3}
                placeholder="可选。比如：玩家在不断重置的雨夜里，判断谁还记得上一轮故事。"
                className="mt-1.5 w-full resize-none rounded-xl border border-sp-border bg-sp-muted px-3 py-2 text-sm leading-6 text-sp-text outline-none transition-colors placeholder:text-sp-subdued/70 focus:border-sp-accent"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-3">
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

              <div className="md:col-span-2">
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

              <div className="md:col-span-3">
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
            </div>

            {notice && (
              <div className="rounded-xl border border-sp-accent bg-sp-accentSoft p-3 text-xs leading-5 text-sp-accent">
                {notice}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Link
              href={localePath("/studio/projects", locale)}
              className="inline-flex h-10 items-center rounded-xl border border-sp-border bg-sp-surface px-4 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-solid fa-arrow-right text-[12px]" />
              {saving ? "创建中" : "创建并进入编辑"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
