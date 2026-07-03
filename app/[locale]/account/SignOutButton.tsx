"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

export function SignOutButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push(localePath("/", locale));
        router.refresh();
      }}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-sp-border bg-sp-surface px-4 text-sm font-semibold text-sp-text transition-colors hover:border-sp-accent hover:text-sp-accent disabled:opacity-60"
    >
      <i className="fa-solid fa-right-from-bracket text-[12px]" />
      {loading ? "退出中" : "退出登录"}
    </button>
  );
}
