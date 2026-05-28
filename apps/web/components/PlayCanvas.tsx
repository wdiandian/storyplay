"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Beat, BeatChoice } from "@yume/types";

export type Phase =
  | "loading-first"        // first scene not yet rendered
  | "ready"                // current beat is interactive
  | "vision-thinking"      // background click → waiting on vision verdict
  | "inserting-beat"       // vision-driven beat being generated
  | "transitioning";       // changing scenes (cache miss or speculative wait)

const SHADOW =
  "0 1px 0 rgba(45,24,16,0.05), 0 36px 64px -28px rgba(45,24,16,0.25), 0 8px 18px -6px rgba(45,24,16,0.10)";

// ── Typewriter hook ────────────────────────────────────────────────────
// Returns the progressively-revealed text, a `done` flag, and a `skip()` that
// instantly completes the current text. Reset is keyed by `resetKey` (the beat
// id) rather than the text, so a new beat whose line happens to match the
// previous one still replays from scratch. `done` is derived synchronously
// (not from a post-paint effect) so a stale "done" frame never paints.
function useTypewriter(
  text: string,
  resetKey: string,
  speed = 28,
): { shown: string; done: boolean; skip: () => void } {
  const [displayed, setDisplayed] = useState("");
  const [prevKey, setPrevKey] = useState(resetKey);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Render-phase reset (React "adjust state on prop change" pattern): when the
  // beat changes, drop the old progress before this render commits.
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setDisplayed("");
  }

  useEffect(() => {
    if (!text) return;
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [resetKey, text, speed]);

  const skip = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setDisplayed(text);
  }, [text]);

  // During the throwaway render where the beat just changed, `displayed` still
  // holds the previous beat's text — coerce it to empty so nothing stale shows.
  const shown = resetKey === prevKey ? displayed : "";
  const done = text.length === 0 || shown.length >= text.length;
  return { shown, done, skip };
}

// ── Choice button ──────────────────────────────────────────────────────
function ChoiceButton({
  index,
  label,
  disabled,
  onClick,
}: {
  index: number;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group relative flex-1 min-w-0 px-4 py-3 text-left transition-all duration-200
        disabled:opacity-50 disabled:cursor-wait"
      style={{
        background: "rgba(20, 14, 8, 0.68)",
        border: "1.5px solid rgba(180, 140, 80, 0.65)",
        borderRadius: "6px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,165,90,0.12)",
      }}
    >
      <span
        className="absolute inset-0 rounded-[5px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: "rgba(180,140,60,0.10)",
          border: "1.5px solid rgba(200,165,90,0.85)",
        }}
      />
      <span className="relative flex items-baseline gap-2">
        <span
          className="shrink-0 font-serif text-[11px] num"
          style={{ color: "rgba(195,155,75,0.9)" }}
        >
          {index + 1}.
        </span>
        <span
          className="font-serif text-[13px] md:text-[14px] leading-snug"
          style={{ color: "rgba(245,235,210,0.95)" }}
        >
          {label}
        </span>
      </span>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export function PlayCanvas({
  imageBase64,
  phase,
  beat,
  pendingClick,
  onBackgroundClick,
  onAdvance,
  onSelectChoice,
  fullViewport = false,
}: {
  imageBase64: string | null;
  phase: Phase;
  beat: Beat | null;
  pendingClick: { x: number; y: number } | null;
  onBackgroundClick: (click: { x: number; y: number }) => void;
  onAdvance: () => void;
  onSelectChoice: (choice: BeatChoice) => void;
  fullViewport?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const isChoiceBeat = beat?.next.type === "choice";
  const choices: BeatChoice[] = isChoiceBeat
    ? (beat!.next as { type: "choice"; choices: BeatChoice[] }).choices
    : [];

  const displayBody = beat?.speaker ? beat.line ?? "" : beat?.narration ?? "";
  const { shown: typedBody, done: typingDone, skip: skipTypewriter } =
    useTypewriter(displayBody, beat?.id ?? "", 30);

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (phase !== "ready" || !imgRef.current || !beat) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // If the typewriter is still printing, a click completes it instantly
    // (standard VN affordance) — the page never sees this click.
    if (!typingDone) {
      skipTypewriter();
      return;
    }
    // For continue-type beats, image click advances; for choice beats,
    // image click goes through vision (treat as freeform action).
    if (beat.next.type === "continue") {
      onAdvance();
      return;
    }
    onBackgroundClick({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    });
  }

  const interactive = phase === "ready" && !!imageBase64;
  const dimmed = phase === "transitioning";

  const sizeStyle = fullViewport
    ? { maxWidth: "100vw", maxHeight: "100dvh" }
    : { maxWidth: "96vw", maxHeight: "calc(100dvh - 200px)" };

  const placeholderWidth = fullViewport
    ? "min(100vw, calc(100dvh * 16 / 9))"
    : "min(96vw, calc((100dvh - 200px) * 16 / 9))";

  const footerHint =
    phase === "ready"
      ? isChoiceBeat
        ? "选 · 择 · 一 · 项"
        : "点 · 击 · 推 · 进"
      : "···";

  return (
    <div
      className={`flex flex-col items-center ${fullViewport ? "w-full h-full justify-center" : "w-full"}`}
    >
      {imageBase64 ? (
        <div
          className="relative inline-block"
          style={{ boxShadow: fullViewport ? "none" : SHADOW }}
        >
          {/* Background image */}
          <img
            key={imageBase64.slice(-48)}
            ref={imgRef}
            src={`data:image/png;base64,${imageBase64}`}
            alt="Generated scene"
            onClick={handleImageClick}
            onLoad={(e) => {
              const img = e.currentTarget;
              setDims({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            draggable={false}
            className={`block w-auto h-auto select-none animate-fade-in transition-opacity duration-700 ease-out ${
              interactive ? "cursor-pointer" : "cursor-wait"
            } ${dimmed ? "opacity-40" : "opacity-100"}`}
            style={sizeStyle}
          />

          {!fullViewport && (
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-clay-900/12 to-transparent pointer-events-none" />
          )}

          {beat && (
            <div className="absolute inset-0 flex flex-col justify-end pointer-events-none select-none">
              {choices.length > 0 && (
                <div className="pointer-events-auto px-[3%] pb-[1.5%] flex gap-[1.5%] items-stretch">
                  {choices.map((choice, i) => (
                    <ChoiceButton
                      key={choice.id}
                      index={i}
                      label={choice.label}
                      disabled={phase !== "ready"}
                      onClick={() => onSelectChoice(choice)}
                    />
                  ))}
                </div>
              )}

              {(beat.narration || beat.line) && (
                <div
                  className="pointer-events-none mx-[2%] mb-[2%] px-[3%] py-[2.2%] relative"
                  style={{
                    background: "rgba(14, 10, 6, 0.72)",
                    border: "1.5px solid rgba(175, 138, 72, 0.60)",
                    borderRadius: "6px",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    boxShadow:
                      "0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(200,165,90,0.10)",
                  }}
                >
                  <span
                    className="absolute top-[6px] left-[8px] text-[10px] opacity-40 pointer-events-none"
                    style={{ color: "rgba(195,155,75,1)" }}
                    aria-hidden
                  >
                    ✦
                  </span>
                  <span
                    className="absolute top-[6px] right-[8px] text-[10px] opacity-40 pointer-events-none"
                    style={{ color: "rgba(195,155,75,1)" }}
                    aria-hidden
                  >
                    ✦
                  </span>

                  {beat.speaker && (
                    <p
                      className="font-serif text-[11px] md:text-[12px] smallcaps mb-[0.6em]"
                      style={{ color: "rgba(205,165,90,0.92)" }}
                    >
                      {beat.speaker}
                    </p>
                  )}

                  <p
                    className="font-serif leading-[1.85] text-[13px] md:text-[15px]"
                    style={{ color: "rgba(245,235,210,0.95)" }}
                  >
                    {typedBody}
                    {beat.speaker && beat.narration && (
                      <span
                        className={`block mt-[0.5em] italic text-[12px] md:text-[13px] transition-opacity duration-300 ${
                          typingDone ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ color: "rgba(200,185,155,0.78)" }}
                        aria-hidden={!typingDone}
                      >
                        {beat.narration}
                      </span>
                    )}
                  </p>

                  {typingDone && beat.next.type === "continue" && (
                    <span
                      className="absolute bottom-[6px] right-[10px] text-[10px] animate-slow-pulse"
                      style={{ color: "rgba(195,155,75,0.7)" }}
                      aria-hidden
                    >
                      ▼
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {(phase === "transitioning" || phase === "inserting-beat") && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-[10px] smallcaps text-cream-50/70 animate-slow-pulse">
                {phase === "transitioning"
                  ? "AI · 正 · 在 · 描 · 画 · 下 · 一 · 幕"
                  : "AI · 正 · 在 · 想 · 你 · 看 · 到 · 了 · 什 · 么"}
              </p>
            </div>
          )}

          {pendingClick && (
            <>
              <div
                className="absolute rounded-full border border-ember-500 pointer-events-none"
                style={{
                  left: `${pendingClick.x * 100}%`,
                  top: `${pendingClick.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: 30,
                  height: 30,
                  animation:
                    "yume-ripple 1.6s cubic-bezier(0.16,1,0.3,1) infinite",
                }}
              />
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${pendingClick.x * 100}%`,
                  top: `${pendingClick.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: 11,
                  height: 11,
                  background: "#D97A2E",
                  boxShadow:
                    "0 0 0 3px rgba(251,247,240,0.95), 0 0 14px rgba(217,122,46,0.55)",
                }}
              />
            </>
          )}
        </div>
      ) : (
        <div
          className="relative aspect-video bg-cream-200 flex flex-col items-center justify-center gap-4"
          style={{
            width: placeholderWidth,
            boxShadow: fullViewport ? "none" : SHADOW,
          }}
        >
          <div className="w-1.5 h-1.5 bg-clay-500 rounded-full animate-slow-pulse" />
          <p className="text-[9px] smallcaps text-clay-500 animate-slow-pulse">
            正 · 在 · 绘 · 制 · 第 · 一 · 幕
          </p>
        </div>
      )}

      {!fullViewport && (
        <div
          className="flex items-center justify-between mt-3 px-1 w-full"
          style={{ maxWidth: "96vw" }}
        >
          <span className="text-[9px] smallcaps text-clay-400 num">
            {dims ? `${dims.w} × ${dims.h} · png` : "—"}
          </span>
          <span className="text-[9px] smallcaps text-clay-400">{footerHint}</span>
        </div>
      )}
    </div>
  );
}
