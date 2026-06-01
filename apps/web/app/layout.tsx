import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InfiPlot — AI 实时交互剧情游戏",
  description: "InfiPlot 是一款用 AI 实时生成图片、语音与剧情分支的交互式剧情游戏 Demo。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen overflow-x-hidden">
        {/* Hand-drawn jitter filters used by every .frame element */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <filter id="s1">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.2" />
          </filter>
          <filter id="s2">
            <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
          </filter>
          <filter id="s3">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="11" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="4.2" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
