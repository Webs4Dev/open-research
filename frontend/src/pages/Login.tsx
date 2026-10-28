import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register } from "../api/endpoints";
import { getErrorMessage } from "../lib/errors";
import { ME_QUERY_KEY } from "../components/auth/RequireAuth";

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

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-1 px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm">
        <h1 className="mb-4 text-lg font-medium">
          {mode === "login" ? "Log in to OpenResearch" : "Create an account"}
        </h1>
        <label className="mb-1 block text-sm text-text-secondary" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="input mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="mb-1 block text-sm text-text-secondary" htmlFor="password">
          Password {mode === "register" && <span className="text-text-muted">(at least 8 characters)</span>}
        </label>
        <input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          maxLength={128}
          className="input mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mutation.isError && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {getErrorMessage(mutation.error)}
          </p>
        )}
        <button type="submit" className="btn w-full" disabled={mutation.isPending}>
          {mode === "login" ? "Log in" : "Create account"}
        </button>
        <button
          type="button"
          className="mt-3 w-full text-sm text-text-secondary hover:underline"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            mutation.reset();
          }}
        >
          {mode === "login" ? "No account? Create one" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
