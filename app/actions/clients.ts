"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/auth/session";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * Creating a client workspace is the one operation that legitimately crosses
 * tenants, so it is the one place the service role key is used. Everything it
 * writes is then read back through row level security like anything else.
 */

export interface ClientResult {
  ok: boolean;
  message: string;
  /** Shown once, so it can be handed over. Never stored in readable form. */
  credentials?: { email: string; password: string; workspace: string };
}

const schema = z.object({
  businessName: z.string().trim().min(2, "The business needs a name."),
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
  district: z.string().trim().optional(),
  ownerName: z.string().trim().min(2, "Who is the contact person?"),
  ownerEmail: z.string().trim().email("That does not look like an email."),
  password: z
    .string()
    .min(10, "Use at least ten characters for the handover password."),
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

export async function createClientWorkspaceAction(
  _prev: ClientResult | null,
  formData: FormData,
): Promise<ClientResult> {
  await requirePlatformAdmin();

  const parsed = schema.safeParse({
    businessName: formData.get("businessName"),
    category: formData.get("category"),
    city: formData.get("city"),
    district: formData.get("district") ?? "",
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  }

  const data = parsed.data;
  const admin = getServiceClient();

  // 1. The account. Email is confirmed on creation, because we hand the
  //    password over directly rather than sending an invitation.
  const created = await admin.auth.admin.createUser({
    email: data.ownerEmail,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.ownerName },
  });

  if (created.error || !created.data.user) {
    const message = created.error?.message ?? "The account could not be created.";
    return {
      ok: false,
      message: message.toLowerCase().includes("already")
        ? `${data.ownerEmail} already has an account. Use another address, or add this workspace to the existing one.`
        : message,
    };
  }

  const userId = created.data.user.id;

  // From here on, anything that fails leaves an orphaned account behind, so
  // every step cleans up after itself.
  const rollback = async (reason: string): Promise<ClientResult> => {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, message: reason };
  };

  const profile = await admin.from("profiles").insert({
    user_id: userId,
    full_name: data.ownerName,
    email: data.ownerEmail,
    avatar_initials: initialsOf(data.ownerName),
  });
  if (profile.error) return rollback(`Creating the profile: ${profile.error.message}`);

  const slug = `${slugify(data.businessName)}-${Math.random().toString(36).slice(2, 6)}`;
  const tenant = await admin
    .from("tenants")
    .insert({ name: data.businessName, slug, plan: "trial" })
    .select("id")
    .single();
  if (tenant.error || !tenant.data) {
    await admin.from("profiles").delete().eq("user_id", userId);
    return rollback(`Creating the workspace: ${tenant.error?.message}`);
  }

  const tenantId = (tenant.data as { id: string }).id;

  const cleanupTenant = async (reason: string): Promise<ClientResult> => {
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
  if (member.error) return cleanupTenant(`Adding the owner: ${member.error.message}`);

  // A workspace with no business profile cannot generate anything, so it gets
  // one immediately with defaults the client refines in the setup wizard.
  const businessProfile = await admin.from("business_profiles").insert({
    tenant_id: tenantId,
    name: data.businessName,
    category: data.category,
    city: data.city,
    district: data.district || null,
    description: "",
    tone: "warm_professional",
    tone_descriptors: [],
    emoji_policy: "match_reviewer",
    sign_off: "",
    negative_policy:
      "One apology, never two. Name the problem in the reviewer's own words. Move anything about money, staff or hygiene to a private channel in the first two sentences.",
    escalation_email: data.ownerEmail,
    banned_phrases: [],
    preferred_words: [],
    do_not_mention: [],
    languages: ["pl", "en"],
    primary_language: "pl",
  });
  if (businessProfile.error) {
    return cleanupTenant(
      `Creating the business profile: ${businessProfile.error.message}`,
    );
  }

  await admin.from("activity_logs").insert({
    tenant_id: tenantId,
    actor_user_id: null,
    actor_name: "Platform",
    entity_type: "tenant",
    entity_id: tenantId,
    action: "member.invited",
    metadata: { owner: data.ownerEmail },
  });

  revalidatePath("/clients");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: `${data.businessName} is ready.`,
    credentials: {
      email: data.ownerEmail,
      password: data.password,
      workspace: data.businessName,
    },
  };
}
