"use client";
// The 3-way inventory selector on each product card: אין במלאי (out of
// stock) / מכירה חופשית (unlimited) / להגביל (limited — opens a modal for
// days-from-today + max quantity). The first two submit immediately; the
// third only takes effect when the modal's own form is confirmed.
import { useState, useEffect } from "react";
import { useActionState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  setInventoryUnlimitedAction,
  setInventoryOutOfStockAction,
  setInventoryLimitedAction,
  type FormState,
} from "./actions";

export type InventoryState = {
  mode: "UNLIMITED" | "OUT_OF_STOCK" | "LIMITED";
  limitMaxQuantity: number | null;
  limitSoldCount: number;
  limitExpiresAt: string | null; // pre-formatted, e.g. "12/08"
};

export function InventoryControl({
  productId,
  state,
}: {
  productId: string;
  state: InventoryState;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {/* Full-width segmented control so the three states divide a product
          card's width evenly rather than overflowing on narrow cards. */}
      <div className="flex w-full rounded-xl border border-border bg-surface p-0.5 text-xs">
        <form action={setInventoryOutOfStockAction} className="flex-1">
          <input type="hidden" name="productId" value={productId} />
          <button
            type="submit"
            className={
              state.mode === "OUT_OF_STOCK"
                ? "w-full cursor-pointer whitespace-nowrap rounded-lg bg-danger px-1.5 py-1.5 font-bold text-white"
                : "w-full cursor-pointer whitespace-nowrap rounded-lg px-1.5 py-1.5 font-semibold text-ink-soft hover:bg-surface-2"
            }
          >
            אין במלאי
          </button>
        </form>
        <form action={setInventoryUnlimitedAction} className="flex-1">
          <input type="hidden" name="productId" value={productId} />
          <button
            type="submit"
            className={
              state.mode === "UNLIMITED"
                ? "w-full cursor-pointer whitespace-nowrap rounded-lg bg-accent px-1.5 py-1.5 font-bold text-white"
                : "w-full cursor-pointer whitespace-nowrap rounded-lg px-1.5 py-1.5 font-semibold text-ink-soft hover:bg-surface-2"
            }
          >
            מכירה חופשית
          </button>
        </form>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={
            state.mode === "LIMITED"
              ? "flex-1 cursor-pointer whitespace-nowrap rounded-lg bg-accent px-1.5 py-1.5 font-bold text-white"
              : "flex-1 cursor-pointer whitespace-nowrap rounded-lg px-1.5 py-1.5 font-semibold text-ink-soft hover:bg-surface-2"
          }
        >
          להגביל
        </button>
      </div>

      {state.mode === "LIMITED" && (
        <span className="text-[11px] text-ink-soft">
          נותרו {Math.max(0, (state.limitMaxQuantity ?? 0) - state.limitSoldCount)} מתוך{" "}
          {state.limitMaxQuantity} · עד {state.limitExpiresAt}
        </span>
      )}

      <LimitModal
        productId={productId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        current={state}
      />
    </div>
  );
}

function LimitModal({
  productId,
  open,
  onClose,
  current,
}: {
  productId: string;
  open: boolean;
  onClose: () => void;
  current: InventoryState;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    setInventoryLimitedAction,
    undefined,
  );

  // Close on success rather than leaving the confirmed form sitting open.
  useEffect(() => {
    if (state?.ok === true) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-lg font-extrabold text-ink">הגבלת מלאי</h3>
      <p className="mt-1 text-sm text-ink-soft">
        כמות מקסימלית למכירה בטווח הימים הקרוב. כשהיא מתמלאת המוצר עובר אוטומטית ל&quot;אין
        במלאי&quot;; כשהתקופה מסתיימת הוא חוזר אוטומטית ל&quot;מכירה חופשית&quot;.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="productId" value={productId} />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">ימים מהיום</span>
          <input
            name="days"
            type="number"
            min={1}
            max={365}
            required
            defaultValue={current.mode === "LIMITED" ? undefined : 7}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">כמות מקסימלית</span>
          <input
            name="maxQuantity"
            type="number"
            min={1}
            max={100000}
            required
            defaultValue={current.limitMaxQuantity ?? 10}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>

        {state?.ok === false && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? "שומר…" : "אישור"}
        </Button>
      </form>
    </Modal>
  );
}
