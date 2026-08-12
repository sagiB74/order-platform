// Password hashing — the ONLY place raw passwords are handled.
//
// WHY bcrypt: we must never store a password as plain text. bcrypt turns a
// password into a one-way hash with a built-in random "salt", so two users
// with the same password get different hashes, and the original can't be
// recovered from the database. The "cost" (10) controls how slow hashing is —
// deliberately slow, to make brute-forcing stolen hashes expensive.
import "server-only";
import bcrypt from "bcryptjs";

const COST = 10;

/** Turn a plain-text password into a storable hash. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

/** Check a plain-text password against a stored hash. Returns true if it matches. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
