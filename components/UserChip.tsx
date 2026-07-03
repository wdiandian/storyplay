"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

  if (!AUTH_ENABLED || !user) return null;

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
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center justify-center rounded-full border border-cream-50/15 bg-cream-50/[0.06] p-0.5 text-cream-50/80 transition-colors hover:bg-cream-50/[0.12]"
        title={label}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-4 w-4 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(175,138,72,0.6)] text-[9px] font-medium text-cream-50">
            {initial}
          </span>
        )}
      </button>
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[156px] overflow-hidden rounded-md"
            style={{
              background: "rgba(14, 10, 6, 0.92)",
              border: "1px solid rgba(175, 138, 72, 0.5)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <div className="border-b border-cream-50/10 px-3.5 py-2.5">
              <div className="truncate text-[12px] font-medium text-cream-50/90">{label}</div>
              <div className="mt-0.5 truncate text-[10px] text-cream-50/45">{user.email}</div>
            </div>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={localePath(item.href, locale)}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[12px] text-cream-50/70 transition-colors hover:bg-cream-50/[0.08] hover:text-cream-50/90"
              >
                <i className={`fa-solid ${item.icon} w-4 text-center text-[11px]`} />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 border-t border-cream-50/10 px-3.5 py-2.5 text-[12px] text-cream-50/70 transition-colors hover:bg-cream-50/[0.08] hover:text-cream-50/90"
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
