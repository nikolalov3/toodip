import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

/**
 * Authenticated surfaces read cookies and must never be prerendered. Without
 * this, a build in an environment that has no Supabase configuration tries to
 * render them as static pages and fails, instead of deploying an app that
 * reports the missing configuration at runtime.
 */
export const dynamic = "force-dynamic";


export const metadata: Metadata = { title: "Setup" };

export default async function OnboardingPage() {
  await requireSession();
  const repo = await getRepository();
  const [profile, tenant] = await Promise.all([
    repo.getBusinessProfile(),
    repo.getTenant(),
  ]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <Logo size={30} wordmarkClassName="text-base" />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">
          Set up {tenant.name}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Four steps. Everything here becomes the brand layer of the prompt, so
          a reply can only ever say things you have written down.
        </p>
      </header>

      <OnboardingWizard profile={profile} />

      <p className="mt-6 text-xs text-muted-foreground">
        Prefer to do this later?{" "}
        <Link href="/dashboard" className="text-brand hover:underline">
          Skip to the dashboard
        </Link>
        . The same fields live in brand settings.
      </p>
    </div>
  );
}
