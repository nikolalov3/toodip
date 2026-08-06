"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";

import { ACTIVE_TENANT_COOKIE, requireSession } from "@/lib/auth/session";
import { getUserClient } from "@/lib/supabase/server";

export interface AuthResult {
  ok: boolean;
  message: string;
}

const signInSchema = z.object({
  email: z.string().trim().email("That does not look like an email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function signInAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await getUserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Supabase deliberately does not say which half was wrong. Neither do we.
    return { ok: false, message: "Wrong email or password." };
  }

  const next = String(formData.get("next") ?? "/dashboard");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOutAction() {
  const supabase = await getUserClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_TENANT_COOKIE);
  redirect("/sign-in");
}

/** Platform admins operate inside one client workspace at a time. */
export async function switchWorkspaceAction(tenantId: string) {
  const session = await requireSession();
  const allowed = session.workspaces.some(
    (workspace) => workspace.id === tenantId,
  );
  if (!allowed) {
    throw new Error("That workspace is not yours to open.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Use at least ten characters. This is the only lock on the account."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "The two passwords do not match.",
  });

export async function changePasswordAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  await requireSession();

  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  }

  const supabase = await getUserClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Password changed. It applies from now on." };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name."),
});

export async function updateOwnProfileAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const session = await requireSession();
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName") });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  }

  const initials =
    parsed.data.fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "??";

  const supabase = await getUserClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, avatar_initials: initials })
    .eq("user_id", session.userId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Name updated." };
}
