"use client";
// Route-level error boundary. Catches anything thrown while rendering a page or
// running a Server Action below it, and shows a recoverable screen instead of
// Next's default crash page.
//
// Deliberately does NOT print `error.message`: a thrown ForbiddenError or a
// database error can carry internals (ids, table names, connection details) that
// should never reach a visitor. Next already redacts messages in production
// builds, but relying on that alone would leak them in any self-hosted dev-mode
// deployment. The `digest` is safe — it's a hash Next also writes to the server
// logs, so it's how you match a user's report to the real stack trace.
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side errors are already logged by Next; this captures client ones.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-2xl font-extrabold">משהו השתבש</h1>
      <p className="text-ink/70">
        אירעה שגיאה בטעינת הדף. אפשר לנסות שוב — ואם זה חוזר, נסו לרענן.
      </p>
      <div className="flex gap-3">
        <Button size="lg" onClick={() => reset()}>
          נסו שוב
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-ink/40">קוד שגיאה: {error.digest}</p>
      )}
    </main>
  );
}
