"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

function localePath(path: string, locale: string) {
  if (locale === "zh-CN") return path;
  return `/${locale}${path}`;
}

function readLocaleFromPath(pathname: string | null) {
  if (pathname?.startsWith("/en")) return "en";
  if (pathname?.startsWith("/ja")) return "ja";
  return "zh-CN";
}

export function UserChip() {
  const pathname = usePathname();
  const locale = useMemo(() => readLocaleFromPath(pathname), [pathname]);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
  }, []);

  if (!AUTH_ENABLED) return null;

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-sp-border bg-sp-surface/82 px-3 text-xs font-semibold text-sp-subdued shadow-sm shadow-black/[0.04] outline-none backdrop-blur transition-colors hover:border-sp-accent hover:text-sp-accent focus-visible:ring-2 focus-visible:ring-sp-focus/40"
          title="登录"
        >
          <i className="fa-solid fa-user text-[11px]" />
          <span className="hidden sm:inline">登录</span>
        </button>
        {authOpen && (
          <AuthModal
            onClose={() => setAuthOpen(false)}
            onSuccess={() => setAuthOpen(false)}
          />
        )}
      </>
    );
  }

  const label =
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "User";
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initial = label.charAt(0).toUpperCase();

  const menuItems = [
    { href: "/account", icon: "fa-user", label: "账号中心" },
    { href: "/studio/projects", icon: "fa-pen-nib", label: "创作后台" },
    { href: "/stories", icon: "fa-book-open", label: "我的故事" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-sp-border bg-sp-surface/82 px-2.5 text-xs font-semibold text-sp-subdued shadow-sm shadow-black/[0.04] outline-none backdrop-blur transition-colors hover:border-sp-accent hover:text-sp-accent focus-visible:ring-2 focus-visible:ring-sp-focus/40"
        title="账号"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-5 w-5 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sp-accentSoft text-[10px] font-semibold text-sp-accent">
            {initial}
          </span>
        )}
        <span className="hidden sm:inline">账号</span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[176px] overflow-hidden rounded-xl border border-sp-border bg-sp-surface shadow-[0_18px_48px_rgba(0,0,0,0.12)] backdrop-blur">
            <div className="border-b border-sp-border px-3.5 py-2.5">
              <div className="truncate text-[12px] font-semibold text-sp-text">{label}</div>
              <div className="mt-0.5 truncate text-[10px] text-sp-subdued">{user.email}</div>
            </div>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={localePath(item.href, locale)}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[12px] text-sp-subdued transition-colors hover:bg-sp-muted hover:text-sp-text"
              >
                <i className={`fa-solid ${item.icon} w-4 text-center text-[11px]`} />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 border-t border-sp-border px-3.5 py-2.5 text-[12px] text-sp-subdued transition-colors hover:bg-sp-muted hover:text-sp-text"
            >
              <i className="fa-solid fa-right-from-bracket w-4 text-center text-[11px]" />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
