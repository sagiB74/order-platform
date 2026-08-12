// Validated, typed access to environment variables.
//
// WHY this exists: reading `process.env.FOO` directly gives you `string |
// undefined` everywhere and fails at a random later point if a var is missing.
// We validate once, here, so the app refuses to start with a bad config and
// every other file gets a fully-typed `env` object.
import { z } from "zod";

const schema = z.object({
  // Postgres connection string (from Neon). Required for the app to run.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (get it from Neon)"),
  // Secret that signs session tokens. Must be long/random and kept private.
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable message rather than a deep stack trace.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
