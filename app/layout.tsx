import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { LOCALES } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/navigation";
import { stripLocalePrefix } from "@/lib/i18n/navigation";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StoryPlay - AI interactive story game",
  description: "StoryPlay turns a story idea into a playable AI interactive visual story with generated scenes, voice, and branching choices.",
};

// viewportFit:cover lets the immersive /play portrait layout extend under the
// iOS notch / home-indicator and exposes env(safe-area-inset-*) to the
// floating controls. device-width + initialScale keep mobile rendering 1:1.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const locale = headersList.get("x-locale") || "zh-CN";

  const origin =
    process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://storyplay.app");
  const pathname = headersList.get("x-pathname") || "/";
  const barePath = stripLocalePrefix(pathname);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoSerifSC.variable}`}
      suppressHydrationWarning
    >
      <head>
        {LOCALES.map((l) => (
          <link
            key={l}
            rel="alternate"
            hrefLang={l}
            href={`${origin}${localePath(barePath, l)}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${origin}${barePath}`} />
      </head>
      <body className="bg-sp-bg text-sp-text font-sans antialiased min-h-screen overflow-x-hidden">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
