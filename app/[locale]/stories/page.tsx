"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteStory, loadStoryList } from "@/lib/clientStoryPersistence";
import type { StoryMeta } from "@/lib/db/repositories/storyRepo";
import { useLocalePath } from "@/lib/i18n/hooks";

export default function StoriesPage() {
  const lp = useLocalePath();
  const [stories, setStories] = useState<StoryMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadStoryList()
      .then(setStories)
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (storyId: string) => {
    if (!confirm("确认删除这个故事存档？此操作无法撤销。")) return;

    setDeletingId(storyId);
    const success = await deleteStory(storyId);

    if (success) {
      setStories((prev) => prev.filter((story) => story.id !== storyId));
    } else {
      alert("删除失败，请稍后重试。");
    }

    setDeletingId(null);
  };

  const formatDate = (value: Date | string | number) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days} 天前`;

    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-sp-bg text-sp-text">
      <header className="flex items-center justify-between px-6 pt-7 md:px-16 md:pt-10">
        <Link
          href={lp("/")}
          className="flex cursor-pointer items-center gap-2 text-[10px] smallcaps text-sp-subdued transition-colors hover:text-sp-accent"
        >
          <i className="fa-solid fa-arrow-left text-[9px]" />
          StoryPlay
        </Link>
        <span className="text-[10px] smallcaps text-sp-subdued">我的故事</span>
      </header>

      <section className="flex-1 px-6 pb-20 pt-16 md:px-16 md:pb-24 md:pt-24">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-[10px] smallcaps text-sp-subdued">加载中</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <i className="fa-solid fa-book-open mb-6 text-4xl text-sp-subdued/50" />
            <p className="mb-4 font-serif text-lg italic text-sp-subdued">
              还没有保存的故事
            </p>
            <Link
              href={lp("/")}
              className="cursor-pointer text-[10px] smallcaps text-sp-accent transition-opacity hover:opacity-80"
            >
              回到首页开始新的故事
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="font-serif text-3xl font-black md:text-5xl">我的故事</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-sp-subdued">
                这里会展示已保存的游玩记录。登录状态下优先读取服务端存档，未登录或服务端不可用时保留本地存档兜底。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="group relative rounded-2xl border border-sp-border bg-sp-surface p-6 shadow-sm shadow-black/[0.04] transition-all duration-200 hover:border-sp-accent/40 hover:shadow-md"
                >
                  <Link
                    href={lp(`/play?storyId=${encodeURIComponent(story.id)}`)}
                    className="block cursor-pointer"
                  >
                    <div className="mb-4">
                      <h3 className="mb-2 line-clamp-2 font-serif text-lg leading-tight text-sp-text">
                        {story.worldSetting.slice(0, 60)}
                        {story.worldSetting.length > 60 ? "..." : ""}
                      </h3>
                      <p className="line-clamp-1 text-sm text-sp-subdued">
                        {story.styleGuide}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] smallcaps text-sp-subdued">
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-photo-film text-[9px]" />
                        {story.sceneCount} 场
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-clock text-[9px]" />
                        {formatDate(story.updatedAt)}
                      </span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDelete(story.id);
                    }}
                    disabled={deletingId === story.id}
                    aria-label="删除故事"
                    className="absolute right-4 top-4 cursor-pointer text-sp-subdued opacity-0 transition-opacity hover:text-sp-accent disabled:opacity-50 group-hover:opacity-100"
                  >
                    <i className={deletingId === story.id ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-trash-can"} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="px-6 pb-8 md:px-16">
        <div className="mb-4 h-px w-full bg-sp-border" />
        <div className="flex items-center justify-between text-[10px] smallcaps text-sp-subdued">
          <span>MMXXVI</span>
          <span>{stories.length} 个故事</span>
        </div>
      </footer>
    </div>
  );
}
