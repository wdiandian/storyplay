"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";

type AuthStep = "email-input" | "otp-verify";

export function AuthModal({
  onClose,
  onSuccess,
  onBeforeOAuth,
}: {
  onClose: () => void;
  onSuccess: () => void;
  // Fires synchronously before the OAuth full-page redirect. Hosts that need
  // to survive the round-trip can snapshot in-memory state here.
  onBeforeOAuth?: () => void;
}) {
  const [step, setStep] = useState<AuthStep>("email-input");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      onBeforeOAuth?.();
    } catch {
      /* snapshot failure is non-fatal */
    }

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }, [onBeforeOAuth]);

  const handleSendOtp = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
    });
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStep("otp-verify");
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    const trimmedOtp = otp.trim();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedOtp) return;

    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedOtp,
      type: "email",
    });
    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    track("login_success", { provider: "email" });
    onSuccess();
  }, [email, otp, onSuccess]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "rgba(14, 10, 6, 0.92)",
          border: "1.5px solid rgba(175, 138, 72, 0.72)",
          borderRadius: "8px",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow:
            "0 10px 42px rgba(0,0,0,0.62), inset 0 1px 0 rgba(200,165,90,0.12)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t("auth.ariaLabel")}
      >
        <div className="flex items-center justify-between border-b border-cream-50/10 px-5 py-3.5">
          <div className="flex items-center gap-2 text-[11px] smallcaps text-cream-50/70">
            <i className="fa-solid fa-envelope text-[11px]" />
            {step === "email-input" ? t("auth.steps.email") : t("auth.steps.otp")}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center text-cream-50/60 transition-colors hover:text-cream-50"
            aria-label={t("auth.close")}
          >
            <i className="fa-solid fa-xmark text-[12px]" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-5">
          {error && (
            <p className="text-[12px] leading-snug text-red-400/90">{error}</p>
          )}

          {step === "email-input" && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-2.5 rounded-md border border-cream-50/15 bg-cream-50/[0.06] px-4 py-2.5 text-[13px] text-cream-50/90 transition-colors hover:bg-cream-50/[0.12] disabled:opacity-50"
              >
                <i className="fa-brands fa-google text-[14px]" />
                {t("auth.googleLogin")}
              </button>
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-cream-50/10" />
                <span className="text-[10px] text-cream-50/40">{t("auth.or")}</span>
                <div className="h-px flex-1 bg-cream-50/10" />
              </div>
              <p className="text-[12px] leading-5 text-cream-50/58">
                {t("auth.emailHint")}
              </p>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSendOtp()}
                placeholder={t("auth.emailPlaceholder")}
                autoFocus
                className="w-full rounded-md border border-cream-50/15 bg-cream-50/[0.06] px-3.5 py-2.5 text-[13px] text-cream-50/90 outline-none placeholder:text-cream-50/30 focus:border-[rgba(175,138,72,0.6)]"
              />
              <button
                type="button"
                disabled={loading || !email.trim()}
                onClick={handleSendOtp}
                className="w-full rounded-md bg-[rgba(175,138,72,0.85)] px-4 py-2.5 text-[13px] font-medium text-cream-50 transition-colors hover:bg-[rgba(175,138,72,1)] disabled:opacity-50"
              >
                {loading ? t("auth.sending") : t("auth.sendCode")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-[12px] text-cream-50/50 transition-colors hover:text-cream-50/80"
              >
                {t("auth.close")}
              </button>
            </>
          )}

          {step === "otp-verify" && (
            <>
              <p className="text-[12px] leading-snug text-cream-50/60">
                {t("auth.codeSent", { email: email.trim() })}
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                onKeyDown={(event) => event.key === "Enter" && handleVerifyOtp()}
                placeholder={t("auth.codePlaceholder")}
                autoFocus
                className="w-full rounded-md border border-cream-50/15 bg-cream-50/[0.06] px-3.5 py-2.5 text-center text-[16px] tracking-[0.35em] text-cream-50/90 outline-none placeholder:text-cream-50/30 placeholder:tracking-normal focus:border-[rgba(175,138,72,0.6)]"
              />
              <button
                type="button"
                disabled={loading || otp.length < 6}
                onClick={handleVerifyOtp}
                className="w-full rounded-md bg-[rgba(175,138,72,0.85)] px-4 py-2.5 text-[13px] font-medium text-cream-50 transition-colors hover:bg-[rgba(175,138,72,1)] disabled:opacity-50"
              >
                {loading ? t("auth.verifying") : t("auth.verify")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email-input");
                  setOtp("");
                  setError("");
                }}
                className="w-full text-center text-[12px] text-cream-50/50 transition-colors hover:text-cream-50/80"
              >
                {t("auth.resend")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
