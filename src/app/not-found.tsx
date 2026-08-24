// Shown for any unmatched route, and wherever notFound() is called (an unknown
// storefront slug, a suspended business, a missing checkout page).
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-5xl font-extrabold text-accent">404</p>
      <h1 className="text-2xl font-extrabold">הדף לא נמצא</h1>
      <p className="text-ink/70">
        ייתכן שהקישור שגוי, או שהחנות שחיפשתם כבר לא זמינה.
      </p>
      <Link href="/">
        <Button size="lg">חזרה לדף הבית</Button>
      </Link>
    </main>
  );
}
