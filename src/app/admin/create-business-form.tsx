"use client";
// The "Create a business" form. Collects the business name + URL slug and the
// owner's login (email + password), then hands off to the Server Action.
import { useActionState } from "react";
import { createBusinessAction, type CreateBusinessState } from "./actions";

const inputClass =
  "rounded-md border border-black/15 bg-white px-3 py-2 text-black outline-none focus:border-black/40 dark:border-white/20 dark:bg-zinc-900 dark:text-white";

export function CreateBusinessForm() {
  const [state, action, pending] = useActionState<CreateBusinessState, FormData>(
    createBusinessAction,
    undefined,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-black/10 p-5 dark:border-white/10"
    >
      <h2 className="text-lg font-semibold">Create a business</h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Business name</span>
        <input name="name" required placeholder="Gluten-Free Home" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Storefront link (slug)</span>
        <input name="slug" required placeholder="gluten-free-home" className={inputClass} />
        <span className="text-xs text-zinc-500">
          Customers will visit <code>/your-slug</code>. Lowercase, hyphens only.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Owner email (their login)</span>
        <input name="ownerEmail" type="email" required placeholder="owner@example.com" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Owner password (temporary)</span>
        <input name="ownerPassword" type="text" required placeholder="at least 8 characters" className={inputClass} />
        <span className="text-xs text-zinc-500">
          You set this and share it with the owner; they can change it later.
        </span>
      </label>

      {state?.ok === false && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.ok === true && (
        <p className="text-sm text-green-700 dark:text-green-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Creating…" : "Create business"}
      </button>
    </form>
  );
}
