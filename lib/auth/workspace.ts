import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";
import type { BusinessProfile } from "@/types/domain";

/**
 * Guard for screens that are about a venue.
 *
 * It lives here rather than in the workspace layout because a shared layout is
 * not re-rendered when navigating between the pages inside it. A guard there
 * only fires on a full page load, which is exactly the case that is easy to
 * miss in testing and easy to hit in use.
 *
 * The platform workspace never has a business profile, so a platform admin who
 * lands on a venue screen is sent to the client list. A client whose setup is
 * unfinished is sent to the wizard.
 */
export async function requireBusinessProfile(): Promise<BusinessProfile> {
  const profile = await loadBusinessProfile();
  if (profile) return profile;
  const session = await requireSession();
  redirect(session.isPlatformAdmin ? "/clients" : "/onboarding");
}

/** The active workspace's profile, or null. One query per request. */
export const loadBusinessProfile = cache(async function loadBusinessProfile(): Promise<BusinessProfile | null> {
  try {
    const repo = await getRepository();
    return await repo.getBusinessProfile();
  } catch {
    return null;
  }
});
