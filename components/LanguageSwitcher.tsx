"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_NAMES, type Locale, setLocale as saveLocalePreference } from "@/lib/i18n/config";
import { localePath, stripLocalePrefix } from "@/lib/i18n/navigation";

interface LanguageSwitcherProps {
  className?: string;
  /** "compact" = icon + short label, fits a header next to other icons.
   *  "full" = icon + full label + chevron, for a settings panel row. */
  variant?: "compact" | "full";
}

const SHORT_LOCALE_NAMES: Record<Locale, string> = {
  "zh-CN": "中文",
  en: "EN",
  ja: "日本語",
};

export function LanguageSwitcher({ className = "", variant = "full" }: LanguageSwitcherProps) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocaleName = LOCALE_NAMES[locale] || locale;
  const currentShortName = SHORT_LOCALE_NAMES[locale] || locale;

  function switchTo(newLocale: Locale) {
    const basePath = stripLocalePrefix(pathname);
    const newPath = localePath(basePath, newLocale);
    // Only persist to localStorage — do NOT update React state (setLocale)
    // because that triggers a re-render with isLoading=true before the
    // browser navigates away, flashing translation keys for one frame.
    saveLocalePreference(newLocale);
    window.location.assign(newPath);
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          variant === "compact"
            ? "inline-flex items-center gap-1.5 rounded-full border border-sp-border bg-sp-surface/82 px-3 py-2 text-sm text-sp-subdued shadow-sm shadow-black/[0.04] outline-none backdrop-blur transition-colors hover:border-sp-accent hover:text-sp-accent focus-visible:ring-2 focus-visible:ring-sp-focus/40"
            : "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sp-text transition-colors hover:bg-sp-muted"
        }
        aria-label={t("language.select")}
        title={t("language.select")}
        aria-expanded={isOpen}
      >
        <i className="fa-solid fa-globe" />
        <span className={variant === "compact" ? "text-[12px] font-sans" : "text-sm"}>
          {variant === "compact" ? currentShortName : currentLocaleName}
        </span>
        {variant === "full" && (
          <i
            className={`fa-solid fa-chevron-down text-[9px] transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-sp-border bg-sp-surface shadow-xl shadow-black/10">
            <div className="py-1">
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => switchTo(loc)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm font-serif transition-colors hover:bg-sp-muted ${
                    locale === loc ? "text-sp-accent" : "text-sp-text"
                  }`}
                >
                  {LOCALE_NAMES[loc]}
                  {locale === loc && <i className="fa-solid fa-check text-[10px]" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
