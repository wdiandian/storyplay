"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

export function StudioAuthGate({
  locale,
  title = "登录后继续创作",
  description = "创作后台会保存你的故事工程、素材、试玩记录和发布状态。登录后，这些内容会归属到你的账号，后续也能继续编辑和发布。",
}: {
  locale: string;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="min-h-screen bg-sp-bg text-sp-text">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-10 md:px-8">
        <Link
          href={localePath("/", locale)}
          className="mb-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-sp-subdued transition-colors hover:text-sp-accent"
        >
          <i className="fa-solid fa-arrow-left text-[12px]" />
          返回首页
        </Link>

        <section className="rounded-2xl border border-sp-border bg-sp-surface p-6 shadow-sm shadow-black/[0.04] md:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sp-accentSoft text-sp-accent">
            <i className="fa-solid fa-lock text-sm" />
          </div>
          <div className="mt-5 text-[10px] smallcaps text-sp-subdued">Creator Workspace</div>
          <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-sp-text md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sp-subdued md:text-[15px]">
            {description}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-sp-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <i className="fa-solid fa-right-to-bracket text-[12px]" />
              登录继续
            </button>
            <Link
              href={localePath("/", locale)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-4 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent"
            >
              先逛逛故事
            </Link>
          </div>
        </section>
      </div>

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            router.refresh();
          }}
        />
      )}
    </main>
  );
}
