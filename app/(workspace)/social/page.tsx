import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/common/module-placeholder";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Social content agent" };

export default async function SocialPage() {
  await requireSession();

  return (
    <ModulePlaceholder
      icon={Sparkles}
      title="Social content agent"
      summary="Turns what already happens in the venue into posts that sound like the same business, on the same brand rules as the replies."
      capabilities={[
        "Draft posts from an approved reply, a new menu item or a guest photo.",
        "Same banned phrases, same tone, same keyword discipline as review replies.",
        "A weekly plan the owner approves once instead of writing from scratch.",
        "Reuse of the review corpus: what guests praise most becomes what gets posted.",
        "Scheduling handoff to the publishing tool the venue already uses.",
      ]}
      reuses={[
        "Brand voice examples and tone descriptors.",
        "Banned phrases and never mention list.",
        "Approved replies as a source of proven wording.",
      ]}
      dependsOn={[
        "Media storage for guest photos.",
        "A scheduling and publishing integration.",
        "Per channel formatting rules.",
      ]}
    />
  );
}
