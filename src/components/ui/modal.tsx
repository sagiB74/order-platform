"use client";
// Lightweight centered modal/dialog. Closes on Escape, on backdrop click, and
// locks body scroll while open. Token-based styling.
import { useEffect, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="סגירה"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/50"
      />
      <div className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink hover:bg-surface-2"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
