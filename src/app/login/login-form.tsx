"use client";
// The login form. Marked "use client" because it uses React state
// (useActionState) to show validation errors and a pending state while the
// server processes the submission.
//
// It does NOT contain any auth logic itself — it just collects email/password
// and hands them to the `login` Server Action. All the real work (and all the
// secrets) stay on the server.
import { useActionState } from "react";
import { login, type LoginState } from "@/modules/auth/actions";

export function LoginForm() {
  // useActionState wires the form to the Server Action:
  //   state   -> what the action returned (e.g. an error message)
  //   action  -> pass to <form action={...}>
  //   pending -> true while the action is running
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-black/15 bg-white px-3 py-2 text-black outline-none focus:border-black/40 dark:border-white/20 dark:bg-zinc-900 dark:text-white"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-black/15 bg-white px-3 py-2 text-black outline-none focus:border-black/40 dark:border-white/20 dark:bg-zinc-900 dark:text-white"
        />
      </label>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
