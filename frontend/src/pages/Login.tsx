import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register } from "../api/endpoints";
import { getErrorMessage } from "../lib/errors";
import { ME_QUERY_KEY } from "../components/auth/RequireAuth";
import { BrandMark } from "../components/layout/Sidebar";
import { ErrorPanel } from "../components/common/ErrorPanel";

/** The first screen a visitor sees: what the app does on the left, the form on the right (stacked below 1024px). */
export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => (mode === "login" ? login : register)({ email, password }),
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const isLogin = mode === "login";

  return (
    <div className="flex min-h-full flex-col bg-canvas px-10 py-10 max-lg:px-6 max-sm:px-4">
      <header>
        <BrandMark />
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] flex-1 items-center gap-16 py-12 lg:grid-cols-[1fr_400px] max-lg:gap-10">
        <div className="animate-rise">
          <h1 className="max-w-xl text-balance font-display text-display text-ink max-sm:text-display-sm">
            Research that starts with your project.
          </h1>
          <p className="mt-4 max-w-[52ch] text-body-lg text-ink-muted">
            Search six sources at once, score every paper against what you're building, then read it with the relevant
            passages highlighted and ask it questions.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card flex flex-col gap-4 animate-rise" style={{ animationDelay: "80ms" }}>
          <h2 className="font-display text-h2 text-ink">{isLogin ? "Log in" : "Create an account"}</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-ink" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-ink" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              aria-describedby={isLogin ? undefined : "password-hint"}
              required
              minLength={8}
              maxLength={128}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {!isLogin && (
              <p id="password-hint" className="text-body-sm text-ink-subtle">
                At least 8 characters.
              </p>
            )}
          </div>

          {mutation.isError && <ErrorPanel message={getErrorMessage(mutation.error)} />}

          <button type="submit" className="btn mt-2 w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (isLogin ? "Logging in…" : "Creating account…") : isLogin ? "Log in" : "Create account"}
          </button>

          <p className="text-center text-body-sm text-ink-subtle">
            {isLogin ? "No account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="rounded-sm font-medium text-accent-ink hover:underline"
              onClick={() => {
                setMode(isLogin ? "register" : "login");
                mutation.reset();
              }}
            >
              {isLogin ? "Create one" : "Log in"}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
