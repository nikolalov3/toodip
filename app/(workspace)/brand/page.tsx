import { Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/surfaces";
import { BrandVoiceEditor } from "@/components/settings/brand-voice-editor";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { KeywordBankEditor } from "@/components/settings/keyword-bank-editor";
import { canEditSettings, requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

export const metadata: Metadata = { title: "Brand settings" };

export default async function BrandPage() {
  const session = await requireSession();
  const repo = await getRepository();
  const [profile, keywords, brandVoice] = await Promise.all([
    repo.getBusinessProfile(),
    repo.listKeywordItems(),
    repo.listBrandVoiceExamples(),
  ]);

  const readOnly = !canEditSettings(session.role);

  return (
    <>
      <PageHeader
        title="Brand settings"
        description="Everything on this page is compiled into the brand layer of the prompt. Change it here and every future reply changes with it."
        actions={
          <Link
            href="/prompt-studio"
            className="text-xs font-medium text-brand hover:underline"
          >
            See the assembled prompt
          </Link>
        }
      />

      {readOnly && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
          <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            You are signed in as a member. Brand settings are read only for this
            role. Switch to the workspace admin from the user menu to edit.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <BusinessProfileForm profile={profile} readOnly={readOnly} />
        <KeywordBankEditor items={keywords} readOnly={readOnly} />
        <BrandVoiceEditor examples={brandVoice} readOnly={readOnly} />
      </div>
    </>
  );
}
