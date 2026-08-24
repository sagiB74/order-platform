"use client";
// The customer's shopping cart — a small client-side store (React Context +
// localStorage). This state lives only in the browser. Submitting it becomes a
// real Order via the checkout form, which posts productIds and quantities to
// submitCheckoutAction; prices here are for DISPLAY ONLY and are never sent —
// the server re-reads them from the database.
//
// The cart is namespaced per business (derived from the slug), so visiting two
// different storefronts never mixes their carts.
//
// The provider is mounted in src/app/[slug]/layout.tsx rather than inside each
// storefront template, so both the catalog page and the /[slug]/checkout route
// share one cart.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
};

type CartItems = Record<string, CartLine>;

type CartValue = {
  lines: CartLine[];
  count: number;
  totalCents: number;
  add: (item: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  setLine: (item: Omit<CartLine, "quantity">, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** The business slug this cart belongs to — needed to post to the right store. */
  slug: string;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const storageKey = `cart:${slug}`;
  const [items, setItems] = useState<CartItems>({});
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount (localStorage is only available in the browser).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw) as CartItems);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, [storageKey]);

  // Persist on every change (after the initial load).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items, hydrated, storageKey]);

  const add = useCallback((item: Omit<CartLine, "quantity">, qty = 1) => {
    setItems((prev) => {
      const existing = prev[item.id];
      const quantity = (existing?.quantity ?? 0) + qty;
      return { ...prev, [item.id]: { ...item, quantity } };
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else if (next[id]) next[id] = { ...next[id], quantity: qty };
      return next;
    });
  }, []);

  // Like setQty, but upserts: used by the product modal's "אשר" (Confirm),
  // which sets an ABSOLUTE chosen quantity for a product that may not yet be
  // in the cart (setQty above is a no-op for unknown ids, by design — it only
  // adjusts lines that already exist, e.g. the cart sheet's +/- steppers).
  const setLine = useCallback((item: Omit<CartLine, "quantity">, qty: number) => {
    setItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[item.id];
      else next[item.id] = { ...item, quantity: qty };
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clear = useCallback(() => setItems({}), []);

  const value = useMemo<CartValue>(() => {
    const lines = Object.values(items);
    return {
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totalCents: lines.reduce((s, l) => s + l.priceCents * l.quantity, 0),
      add,
      setQty,
      setLine,
      remove,
      clear,
      slug,
    };
  }, [items, add, setQty, setLine, remove, clear, slug]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
