import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_TENANT_ID, DEMO_USERS, type DemoUserKey } from "@/lib/demo/seed";
import type { MemberRole } from "@/types/domain";

export const SESSION_COOKIE = "rra_session";
export const USER_COOKIE = "rra_user";

export interface Session {
  /** Identifies the demo dataset. Becomes the Supabase auth session later. */
  sessionId: string;
  tenantId: string;
  userId: string;
  userKey: DemoUserKey;
  fullName: string;
  email: string;
  initials: string;
  role: MemberRole;
  jobTitle: string;
}

function isDemoUserKey(value: string | undefined): value is DemoUserKey {
  return value === "owner" || value === "manager" || value === "operator";
}

export async function getSessionId(): Promise<string> {
  const store = await cookies();
  // Middleware guarantees the cookie exists. The fallback keeps route handlers
  // and tests working when they run outside the middleware path.
  return store.get(SESSION_COOKIE)?.value ?? "anonymous-session";
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const userKey = store.get(USER_COOKIE)?.value;
  if (!isDemoUserKey(userKey)) return null;

  const user = DEMO_USERS[userKey];
  return {
    sessionId: store.get(SESSION_COOKIE)?.value ?? "anonymous-session",
    tenantId: DEMO_TENANT_ID,
    userId: user.id,
    userKey,
    fullName: user.fullName,
    email: user.email,
    initials: user.initials,
    role: user.role,
    jobTitle: user.jobTitle,
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/** Callable only from a server action or a route handler. */
export async function signInAs(userKey: DemoUserKey): Promise<void> {
  const store = await cookies();
  store.set(USER_COOKIE, userKey, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(USER_COOKIE);
}

export function canApprove(role: MemberRole): boolean {
  return role === "tenant_admin" || role === "platform_admin";
}

export function canEditSettings(role: MemberRole): boolean {
  return role === "tenant_admin" || role === "platform_admin";
}

export function canSeeDebugTools(role: MemberRole): boolean {
  return role === "platform_admin" || role === "tenant_admin";
}
