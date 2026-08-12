"use server";
// Server Actions for authentication. The `"use server"` directive means these
// functions run ONLY on the server, even though a client form calls them. That
// makes them a safe place to touch the database and set cookies.
//
// Security note (from the Next.js guide): treat Server Actions like public API
// endpoints — always validate input and never leak WHY a login failed (we say
// "Invalid email or password" whether the email is unknown or the password is
// wrong, so an attacker can't discover which emails are registered).
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/modules/auth/password";
import { createSession, destroySession } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";

// Where each role goes after logging in.
function homePathForRole(role: Role): string {
  return role === Role.SUPER_ADMIN ? "/admin" : "/dashboard";
}

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// The shape returned to the form so it can show an error. `undefined` = no
// attempt yet (initial state).
export type LoginState = { error: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // 1. Validate the submitted fields.
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }
  const { email, password } = parsed.data;

  // 2. Look the user up by email.
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, businessId: true },
  });

  // 3. Verify the password. Same generic error for "no such user" and
  //    "wrong password" so we don't reveal which emails exist.
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : false;
  if (!user || !passwordOk) {
    return { error: "Invalid email or password." };
  }

  // 4. Create the signed session cookie.
  await createSession({
    userId: user.id,
    role: user.role,
    businessId: user.businessId,
  });

  // 5. Send them to the right home. NOTE: redirect() works by throwing an
  //    internal signal, so it must be OUTSIDE any try/catch. It never returns.
  redirect(homePathForRole(user.role));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
