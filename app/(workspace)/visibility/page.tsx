import { Radar } from "lucide-react";
import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/common/module-placeholder";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Visibility hub" };

export default async function VisibilityPage() {
  await requireSession();

  return (
    <ModulePlaceholder
      icon={Radar}
      title="Visibility hub"
      summary="How often assistants and search name this venue for the questions its customers actually ask, tracked week over week."
      capabilities={[
        "A prompt universe per venue: the real questions people ask before choosing a place to eat, work or meet.",
        "Weekly measurement of whether the venue is named, and in which position, for each prompt.",
        "Split by engine, so a strong result in one assistant does not hide a blank in another.",
        "Movement alerts when a venue drops out of a prompt it used to win.",
        "The gap list: prompts where competitors appear and this venue does not.",
      ]}
      reuses={[
        "Business profile: city, district and category define the prompt set.",
        "Keyword bank: the same phrases seed the prompt universe.",
        "Published replies: reply volume and recency feed the visibility model.",
      ]}
      dependsOn={[
        "Supabase tables for prompt runs and measurements.",
        "A scheduled job runner for the weekly sweep.",
        "Per engine measurement adapters.",
      ]}
    />
  );
}
