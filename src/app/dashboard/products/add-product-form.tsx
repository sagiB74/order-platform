"use client";
// "הוספת מוצר" — collects name, price (in shekels), an optional category,
// description and image URL, then hands off to createProductAction.
import { useActionState } from "react";
import { createProductAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "rounded-xl border border-border bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-accent";

type CategoryOption = { id: string; name: string };

export function AddProductForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createProductAction,
    undefined,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <h3 className="text-base font-extrabold text-ink">הוספת מוצר</h3>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink">שם המוצר</span>
        <input name="name" required placeholder="עוגת שוקולד" className={inputClass} />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">מחיר (₪)</span>
          <input
            name="price"
            required
            inputMode="decimal"
            placeholder="45"
            className={inputClass}
          />
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">קטגוריה</span>
          <select name="categoryId" className={inputClass} defaultValue="">
            <option value="">— ללא —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink">תיאור (אופציונלי)</span>
        <input
          name="description"
          placeholder="שוקולד עשיר, ללא גלוטן"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink">קישור לתמונה (אופציונלי)</span>
        <input name="imageUrl" placeholder="https://…" className={inputClass} />
        <span className="text-xs text-ink-soft">
          נוסיף העלאת תמונות בהמשך; בינתיים קישור מספיק.
        </span>
      </label>

      {state?.ok === false && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok === true && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "מוסיף…" : "הוספת מוצר"}
      </Button>
    </form>
  );
}
