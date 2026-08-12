"use client";
// "הוספת קטגוריה" — a small companion to the product form so the owner can
// create groups (e.g. "לחמים", "עוגות", "עוגיות") to keep the catalog organized.
import { useActionState } from "react";
import { createCategoryAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "rounded-xl border border-border bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-accent";

export function AddCategoryForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createCategoryAction,
    undefined,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <h3 className="text-base font-extrabold text-ink">הוספת קטגוריה</h3>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink">שם הקטגוריה</span>
        <input name="name" required placeholder="לחמים" className={inputClass} />
      </label>

      {state?.ok === false && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok === true && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" variant="secondary" disabled={pending} className="mt-1">
        {pending ? "מוסיף…" : "הוספת קטגוריה"}
      </Button>
    </form>
  );
}
