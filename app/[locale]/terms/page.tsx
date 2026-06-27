import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/navigation";
import { isValidLocale } from "@/lib/i18n/utils";

export const metadata: Metadata = {
  title: "Terms - storyplay",
  description: "StoryPlay terms page.",
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const lp = (path: string) => localePath(path, locale);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16 md:px-16 md:py-24">
      <Link
        href={lp("/")}
        className="mb-12 inline-flex items-center gap-2 text-sm text-clay-500 transition-colors hover:text-clay-900"
      >
        <i className="fa-solid fa-arrow-left text-xs" />
        <span>Back home</span>
      </Link>

      <section className="rounded-xl border border-clay-900/10 bg-cream-100 p-8 md:p-10">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-clay-500">
          storyplay
        </p>
        <h1 className="mb-4 font-sans text-3xl font-medium leading-tight text-clay-900 md:text-5xl">
          Terms are being rewritten.
        </h1>
        <p className="text-base leading-7 text-clay-600">
          This route is intentionally kept as a placeholder while storyplay
          product terms are updated. The previous project-specific open-source,
          contributor, and repository references have been removed from the
          product surface.
        </p>
      </section>
    </main>
  );
}
