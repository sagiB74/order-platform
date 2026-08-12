// The /login page. A Server Component: it can check the session on the server
// before rendering. If you're already logged in, there's no reason to show the
// form — we send you straight to your home area.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === Role.SUPER_ADMIN ? "/admin" : "/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="mb-1 text-xl font-semibold">Order Platform</h1>
        <p className="mb-6 text-sm text-zinc-500">Sign in to your account</p>
        <LoginForm />
      </div>
    </main>
  );
}
