"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen, Spinner } from "@/components/ui";

type Mode = "signin" | "signup";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const inputClass =
  "w-full px-3 py-2 bg-surface-sunken border border-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent";

export default function LoginPage() {
  const {
    user,
    loading,
    error: globalError,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
  } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name so your circle knows who you are.");
      return;
    }
    run(() =>
      mode === "signup"
        ? signUpWithEmail(name, email.trim(), password)
        : signInWithEmail(email.trim(), password)
    );
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      setError("Enter your email above first, then click “Forgot password”.");
      return;
    }
    run(async () => {
      await resetPassword(email.trim());
      setNotice(`Password reset email sent to ${email.trim()}.`);
    });
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-4">
      <div className="relative bg-surface border border-border rounded-xl p-8 max-w-sm w-full space-y-5 overflow-hidden shadow-[0_12px_32px_hsl(var(--shadow-color)/0.3)]">
        <div className="absolute top-0 left-0 right-0 h-[4px] hazard-edge" />
        <div className="text-center pt-1">
          <h1 className="text-2xl font-display font-extrabold tracking-tight mb-1 text-ink">
            Tool<span className="text-accent">Share</span>
          </h1>
          <p className="text-ink-muted text-sm">
            Share tools with your trusted circles.
          </p>
        </div>

        {globalError && (
          <div className="bg-warn-soft border border-warn/40 rounded-lg px-4 py-3 text-sm text-warn">
            {globalError}
          </div>
        )}
        {error && (
          <div className="bg-bad-soft border border-bad/40 rounded-lg px-4 py-3 text-sm text-bad">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-good-soft border border-good/40 rounded-lg px-4 py-3 text-sm text-good">
            {notice}
          </div>
        )}

        {/* Sign in / Create account toggle */}
        <div className="grid grid-cols-2 bg-surface-sunken border border-border rounded-lg p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`py-2 rounded-md transition-colors ${
              mode === "signin" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`py-2 rounded-md transition-colors ${
              mode === "signup" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
                Your Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Shahzad"
                autoComplete="name"
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-strong text-accent-ink font-semibold rounded-lg transition-all active:translate-y-px shadow-[0_1px_0_0_var(--accent-strong)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
          >
            {busy ? <Spinner size="sm" /> : mode === "signup" ? "Create Account" : "Sign In"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={busy}
              className="w-full text-center text-xs text-ink-faint hover:text-ink-muted transition-colors"
            >
              Forgot password?
            </button>
          )}
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-ink-faint">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={() => run(signInWithGoogle)}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
        >
          {busy ? <Spinner size="sm" /> : <GoogleIcon />}
          Continue with Google
        </button>
      </div>
    </div>
  );
}
