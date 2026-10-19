import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getUserClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/domain";

export const ACTIVE_TENANT_COOKIE = "rra_workspace";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * Signed in, but not attached to any workspace. It happens to the very first
 * account before bootstrap, and to a client account if workspace creation fails
 * halfway. It is a state to explain, not a crash.
 */
/** The session could not be read (expired token, database unreachable). */
export class SessionReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionReadError";
  }
}

export class NoWorkspaceError extends Error {
  constructor(public readonly email: string) {
    super(`${email} is not a member of any workspace.`);
    this.name = "NoWorkspaceError";
  }
}

export interface Session {
  userId: string;
  email: string;
  fullName: string;
  initials: string;
  /** Role inside the active workspace. */
  role: MemberRole;
  isPlatformAdmin: boolean;
  tenantId: string;
  tenantName: string;
  jobTitle: string | null;
  /** Workspaces this account may operate in. One for a client, all for us. */
  workspaces: WorkspaceSummary[];
}

interface MembershipRow {
  tenant_id: string;
  role: MemberRole;
  job_title: string | null;
}

/**
 * Resolves who is signed in and which workspace they are operating in.
 * Memoized per request (React cache): a page and its layout and services call
 * this many times, the network is asked once.
 *
 * Everything here runs through the user scoped client, so row level security is
 * what decides which workspaces come back. A client sees exactly one. A platform
 * admin sees all of them and can switch.
 */
export const getSession = cache(async function getSession(): Promise<Session | null> {
  const supabase = await getUserClient();
  // The proxy already refreshed the session; here the token is verified
  // locally (ES256, cached JWKS) and the three queries below run under RLS
  // with that token, so nothing is trusted that the database would not also
  // have checked. Saves a 150–2000 ms round trip to the auth server.
  const { data: claimsResult } = await supabase.auth.getClaims();
  const claims = claimsResult?.claims;
  if (!claims?.sub) return null;
  const user = { id: claims.sub as string, email: (claims.email as string | undefined) ?? undefined };

  const [profileResult, membershipResult, tenantResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, avatar_initials")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("tenant_members")
      .select("tenant_id, role, job_title")
      .eq("user_id", user.id),
    supabase.from("tenants").select("id, name, slug").order("name"),
  ]);

  // A query error here means the token was rejected or the database did not
  // answer. That is a session problem to recover from, not an empty account.
  const queryError = membershipResult.error ?? tenantResult.error ?? profileResult.error;
  if (queryError) throw new SessionReadError(queryError.message);

  const memberships = (membershipResult.data ?? []) as MembershipRow[];
  const workspaces = ((tenantResult.data ?? []) as WorkspaceSummary[]).map(
    (tenant) => ({ id: tenant.id, name: tenant.name, slug: tenant.slug }),
  );

  if (workspaces.length === 0) {
    throw new NoWorkspaceError(user.email ?? "This account");
  }

  const isPlatformAdmin = memberships.some(
    (row) => row.role === "platform_admin",
  );

  const cookieStore = await cookies();
  const requested = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const active =
    workspaces.find((workspace) => workspace.id === requested) ??
    workspaces.find((workspace) =>
      memberships.some((row) => row.tenant_id === workspace.id),
    ) ??
    workspaces[0];

  const membershipHere = memberships.find(
    (row) => row.tenant_id === active.id,
  );

  const profile = profileResult.data as {
    full_name: string;
    email: string;
    avatar_initials: string;
  } | null;

  const fullName = profile?.full_name ?? user.email ?? "Unknown user";

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName,
    initials: profile?.avatar_initials ?? initialsOf(fullName),
    role: membershipHere?.role ?? (isPlatformAdmin ? "platform_admin" : "tenant_member"),
    isPlatformAdmin,
    tenantId: active.id,
    tenantName: active.name,
    jobTitle: membershipHere?.job_title ?? null,
    workspaces,
  };
});

export async function requireSession(): Promise<Session> {
  let session: Session | null = null;
  try {
    session = await getSession();
  } catch (error) {
    // A signed in account with nowhere to go gets an explanation, not a stack
    // trace. Sending it back to sign in would loop, since the proxy bounces
    // signed in users away from that screen.
    if (error instanceof NoWorkspaceError) redirect("/no-workspace");
    if (error instanceof SessionReadError) redirect("/sign-in?reason=expired");
    throw error;
  }
  if (!session) redirect("/sign-in");
  return session;
}

export async function requirePlatformAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!session.isPlatformAdmin) redirect("/overview");
  return session;
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "??"
  );
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
