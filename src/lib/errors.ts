// Typed application errors.
//
// WHY: business logic (in modules/) should not know about HTTP. It throws a
// semantic error like NotFoundError; the outer route/action layer catches it
// and translates `.status` into an HTTP response. This keeps the layers clean
// and gives us one consistent error shape across the whole app.

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name; // e.g. "NotFoundError" in stack traces
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input") {
    super(message, 400, "VALIDATION");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// The one that enforces tenant isolation at the semantic level.
export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, 404, "NOT_FOUND");
  }
}

/**
 * Some requested items are no longer orderable (deleted, sold out, or over a
 * remaining limit). 409 rather than 400: the request was well-formed, it just
 * lost a race against the current state of the catalog.
 *
 * Carries the affected lines so the storefront can tell the customer exactly
 * what changed and offer to fix their cart, instead of failing with one opaque
 * message. `lines` is structural (productId + reason + availableQuantity) so
 * lib/ takes no runtime dependency on modules/.
 */
export class InventoryUnavailableError extends AppError {
  constructor(
    public readonly lines: {
      productId: string;
      reason: "REMOVED" | "OUT_OF_STOCK" | "LIMITED";
      availableQuantity: number;
    }[],
    message = "Some items are no longer available.",
  ) {
    super(message, 409, "INVENTORY_UNAVAILABLE");
  }
}
