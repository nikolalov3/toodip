"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getServiceClient, getUserClient } from "@/lib/supabase/server";

/**
 * Public self-serve sign-up: one form creates the account, the workspace and a
 * starting business profile, then signs the person in and drops them into the
 * setup wizard. New workspaces start on the free plan; upgrading is what turns
 * the AI engine on.
 */

export interface SignUpResult {
  ok: boolean;
  message: string;
}

const schema = z.object({
  businessName: z.string().trim().min(2, "Your business needs a name."),
  category: z.enum([
    "cafe",
    "restaurant",
    "bakery",
    "bar",
    "hotel",
    "beauty",
    "clinic",
    "trades",
    "other",
  ]),
  city: z.string().trim().min(2, "City is required."),
  fullName: z.string().trim().min(2, "Tell us your name."),
  email: z.string().trim().email("That does not look like an email address."),
  password: z.string().min(10, "Use at least ten characters."),
});

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
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

export async function signUpAction(
  _prev: SignUpResult | null,
  formData: FormData,
): Promise<SignUpResult> {
  const parsed = schema.safeParse({
    businessName: formData.get("businessName"),
    category: formData.get("category"),
    city: formData.get("city"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const data = parsed.data;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      message:
        "Sign-up is not enabled on this deployment yet. SUPABASE_SERVICE_ROLE_KEY is missing on the server.",
    };
  }

  const admin = getServiceClient();

  const created = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  });
  if (created.error || !created.data.user) {
    const message = created.error?.message ?? "The account could not be created.";
    return {
      ok: false,
      message: message.toLowerCase().includes("already")
        ? "This address already has an account. Sign in instead."
        : message,
    };
  }
  const userId = created.data.user.id;

  const rollback = async (reason: string): Promise<SignUpResult> => {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, message: reason };
  };

  const profile = await admin.from("profiles").insert({
    user_id: userId,
    full_name: data.fullName,
    email: data.email,
    avatar_initials: initialsOf(data.fullName),
  });
  if (profile.error) return rollback(profile.error.message);

  const slug = `${slugify(data.businessName)}-${Math.random().toString(36).slice(2, 6)}`;
  const tenant = await admin
    .from("tenants")
    .insert({ name: data.businessName, slug, plan: "trial" })
    .select("id")
    .single();
  if (tenant.error || !tenant.data) {
    await admin.from("profiles").delete().eq("user_id", userId);
    return rollback(tenant.error?.message ?? "The workspace could not be created.");
  }
  const tenantId = tenant.data.id as string;

  const cleanup = async (reason: string): Promise<SignUpResult> => {
    await admin.from("tenants").delete().eq("id", tenantId);
    await admin.from("profiles").delete().eq("user_id", userId);
    return rollback(reason);
  };

  const member = await admin.from("tenant_members").insert({
    tenant_id: tenantId,
    user_id: userId,
    role: "tenant_admin",
    job_title: "Owner",
  });
  if (member.error) return cleanup(member.error.message);

  const businessProfile = await admin.from("business_profiles").insert({
    tenant_id: tenantId,
    name: data.businessName,
    category: data.category,
    city: data.city,
    description: "",
    tone: "warm_professional",
    emoji_policy: "match_reviewer",
    negative_policy:
      "One apology, never two. Name the problem in the reviewer's own words. Move anything about money, staff or hygiene to a private channel in the first two sentences.",
    escalation_email: data.email,
    languages: ["pl", "en"],
    primary_language: "pl",
  });
  if (businessProfile.error) return cleanup(businessProfile.error.message);

  // Sign the fresh account in, then straight into the wizard.
  const supabase = await getUserClient();
  const signedIn = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  if (signedIn.error) {
    return { ok: true, message: "Account created. Sign in to continue." };
  }

  redirect("/onboarding");
}
