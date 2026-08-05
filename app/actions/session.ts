"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession, signInAs, signOut } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";
import type { DemoUserKey } from "@/lib/demo/seed";

export async function signInAction(userKey: DemoUserKey, next = "/dashboard") {
  await signInAs(userKey);
  redirect(next);
}

/** Form entry point for the sign in screen. */
export async function signInFormAction(formData: FormData) {
  const userKey = String(formData.get("user") ?? "owner") as DemoUserKey;
  const next = String(formData.get("next") ?? "/dashboard");
  await signInAs(userKey);
  redirect(next);
}

export async function signOutAction() {
  await signOut();
  redirect("/sign-in");
}

export async function switchUserAction(userKey: DemoUserKey) {
  await signInAs(userKey);
  revalidatePath("/", "layout");
}

/** Restores the seeded workspace for this browser session. */
export async function resetDemoAction() {
  const session = await getSession();
  const repo = await getRepository();
  await repo.reset();
  if (session) {
    await repo.logActivity({
      actorUserId: session.userId,
      actorName: session.fullName,
      entityType: "tenant",
      entityId: session.tenantId,
      action: "demo.reset",
      metadata: {},
    });
  }
  revalidatePath("/", "layout");
}
