"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  updateBusinessProfileAction,
  type SettingsResult,
} from "@/app/actions/settings";
import { Panel } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabels, toneHints, toneLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { BusinessCategory, BusinessProfile, ToneKey } from "@/types/domain";

const STEPS = [
  {
    id: "business",
    title: "The venue",
    hint: "Facts a reply is allowed to use.",
  },
  {
    id: "voice",
    title: "Voice",
    hint: "How it should sound, and what it must never say.",
  },
  {
    id: "policy",
    title: "Bad reviews",
    hint: "What happens when someone is angry.",
  },
  {
    id: "approval",
    title: "Approval",
    hint: "Where the line between automatic and human sits.",
  },
] as const;

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function OnboardingWizard({ profile }: { profile: BusinessProfile }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, formAction, pending] = useActionState<
    SettingsResult | null,
    FormData
  >(updateBusinessProfileAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Setup saved. The workspace is ready.");
      router.push("/dashboard");
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  const isLast = step === STEPS.length - 1;

  return (
    <form action={formAction}>
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((item, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={item.id} className="flex-1 min-w-40">
              <button
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left transition-colors",
                  current
                    ? "border-brand/40 bg-brand-soft"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {done ? (
                    <Check className="size-3 text-positive" />
                  ) : (
                    <span className="text-muted-foreground">{index + 1}.</span>
                  )}
                  {item.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {item.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <Panel className="p-5">
        {/* Every field stays mounted so one submit carries the whole wizard. */}
        <div className={cn("flex flex-col gap-4", step !== 0 && "hidden")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name" className="text-xs">
                Business name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile.name}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="category" className="text-xs">
                Category
              </Label>
              <select
                id="category"
                name="category"
                defaultValue={profile.category}
                className={cn(selectClass, "mt-1.5")}
              >
                {(Object.keys(categoryLabels) as BusinessCategory[]).map(
                  (category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label htmlFor="city" className="text-xs">
                City
              </Label>
              <Input
                id="city"
                name="city"
                defaultValue={profile.city}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="district" className="text-xs">
                District
              </Label>
              <Input
                id="district"
                name="district"
                defaultValue={profile.district ?? ""}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address" className="text-xs">
                Address
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={profile.address ?? ""}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description" className="text-xs">
                What is this place
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={profile.description}
                className="mt-1.5"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Two sentences. This is the only place a reply can get facts from.
              </p>
            </div>
          </div>
        </div>

        <div className={cn("flex flex-col gap-4", step !== 1 && "hidden")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tone" className="text-xs">
                Tone
              </Label>
              <select
                id="tone"
                name="tone"
                defaultValue={profile.tone}
                className={cn(selectClass, "mt-1.5")}
              >
                {(Object.keys(toneLabels) as ToneKey[]).map((tone) => (
                  <option key={tone} value={tone}>
                    {toneLabels[tone]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {toneHints[profile.tone]}
              </p>
            </div>
            <div>
              <Label htmlFor="signOff" className="text-xs">
                Sign off
              </Label>
              <Input
                id="signOff"
                name="signOff"
                defaultValue={profile.signOff}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="toneDescriptors" className="text-xs">
                Tone descriptors, one per line
              </Label>
              <Textarea
                id="toneDescriptors"
                name="toneDescriptors"
                rows={4}
                defaultValue={profile.toneDescriptors.join("\n")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="preferredWords" className="text-xs">
                Phrases to prefer, one per line
              </Label>
              <Textarea
                id="preferredWords"
                name="preferredWords"
                rows={4}
                defaultValue={profile.preferredWords.join("\n")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="bannedPhrases" className="text-xs">
                Banned phrases, one per line
              </Label>
              <Textarea
                id="bannedPhrases"
                name="bannedPhrases"
                rows={4}
                defaultValue={profile.bannedPhrases.join("\n")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="doNotMention" className="text-xs">
                Never mention, one per line
              </Label>
              <Textarea
                id="doNotMention"
                name="doNotMention"
                rows={4}
                defaultValue={profile.doNotMention.join("\n")}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        <div className={cn("flex flex-col gap-4", step !== 2 && "hidden")}>
          <div>
            <Label htmlFor="negativePolicy" className="text-xs">
              How a negative review gets handled
            </Label>
            <Textarea
              id="negativePolicy"
              name="negativePolicy"
              rows={4}
              defaultValue={profile.negativePolicy}
              className="mt-1.5"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Written as a rule, not as a wish. This text goes straight into the
              prompt.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="escalationEmail" className="text-xs">
                Escalation email
              </Label>
              <Input
                id="escalationEmail"
                name="escalationEmail"
                type="email"
                defaultValue={profile.escalationEmail ?? ""}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="escalationPhone" className="text-xs">
                Escalation phone
              </Label>
              <Input
                id="escalationPhone"
                name="escalationPhone"
                defaultValue={profile.escalationPhone ?? ""}
                className="mt-1.5"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Complaints get moved to this contact in the second sentence of the
            reply. Leave it empty and the reply has nowhere to send anyone.
          </p>
        </div>

        <div className={cn("flex flex-col gap-4", step !== 3 && "hidden")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="autoApproveMinStars" className="text-xs">
                Auto approve from
              </Label>
              <select
                id="autoApproveMinStars"
                name="autoApproveMinStars"
                defaultValue={String(profile.approvalSettings.autoApproveMinStars)}
                className={cn(selectClass, "mt-1.5")}
              >
                {[5, 4, 3].map((value) => (
                  <option key={value} value={value}>
                    {value} stars and above
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="draftsPerGeneration" className="text-xs">
                Drafts per generation
              </Label>
              <select
                id="draftsPerGeneration"
                name="draftsPerGeneration"
                defaultValue={String(profile.approvalSettings.draftsPerGeneration)}
                className={cn(selectClass, "mt-1.5")}
              >
                {[1, 2, 3].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="primaryLanguage" className="text-xs">
                Primary language
              </Label>
              <select
                id="primaryLanguage"
                name="primaryLanguage"
                defaultValue={profile.primaryLanguage}
                className={cn(selectClass, "mt-1.5")}
              >
                <option value="pl">Polish</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requireApprovalWhenRiskFlagged"
              defaultChecked={
                profile.approvalSettings.requireApprovalWhenRiskFlagged
              }
              className="size-4 rounded border-input"
            />
            Any risk flag sends the review to a human
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requireApprovalBeforePublish"
              defaultChecked={
                profile.approvalSettings.requireApprovalBeforePublish
              }
              className="size-4 rounded border-input"
            />
            Nothing publishes without an approval record
          </label>
        </div>
      </Panel>

      <div className="mt-4 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={step === 0 || pending}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Button>

        {isLast ? (
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Finish setup"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() =>
              setStep((current) => Math.min(STEPS.length - 1, current + 1))
            }
          >
            Continue
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </form>
  );
}
