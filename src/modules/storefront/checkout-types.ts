// Shared between the public checkout action (server) and the checkout form
// (client). Kept out of actions.ts because every export from a "use server"
// module must be an async function.

/** One line the customer asked for that can no longer be fulfilled. */
export type UnavailableLine = {
  productId: string;
  reason: "REMOVED" | "OUT_OF_STOCK" | "LIMITED";
  /** How many they COULD still order. 0 for REMOVED and OUT_OF_STOCK. */
  availableQuantity: number;
};

/**
 * The result of a checkout attempt, as rendered by the form.
 *
 * `unavailable` is deliberately its own state rather than a generic error: the
 * customer's cart is still valid apart from a few lines, so the UI can tell them
 * exactly what changed and offer to fix it, instead of losing the whole order.
 */
export type CheckoutState =
  | { status: "ok"; orderId: string }
  | { status: "unavailable"; message: string; lines: UnavailableLine[] }
  | { status: "error"; message: string }
  | undefined;
