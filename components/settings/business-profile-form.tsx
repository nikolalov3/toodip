"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  updateBusinessProfileAction,
  type SettingsResult,
} from "@/app/actions/settings";
import { Panel, PanelHeader } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  categoryLabels,
  emojiPolicyHints,
  emojiPolicyLabels,
  toneHints,
  toneLabels,
} from "@/lib/labels";
import type {
  BusinessCategory,
  BusinessProfile,
  EmojiPolicy,
  ToneKey,
} from "@/types/domain";

function Row({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function BusinessProfileForm({
  profile,
  readOnly,
}: {
  profile: BusinessProfile;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsResult | null,
    FormData
  >(updateBusinessProfileAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset disabled={readOnly || pending} className="flex flex-col gap-4">
        <Panel>
          <PanelHeader
            title="Business"
            description="Facts the model is allowed to use. Anything not written here does not exist for a reply."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Row label="Business name" htmlFor="name">
              <Input id="name" name="name" defaultValue={profile.name} required />
            </Row>
            <Row label="Category" htmlFor="category">
              <select
                id="category"
                name="category"
                defaultValue={profile.category}
                className={selectClass}
              >
                {(Object.keys(categoryLabels) as BusinessCategory[]).map(
                  (category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ),
                )}
              </select>
            </Row>
            <Row label="City" htmlFor="city">
              <Input id="city" name="city" defaultValue={profile.city} required />
            </Row>
            <Row
              label="District or neighbourhood"
              htmlFor="district"
              hint="Local anchors like this are what make a reply sound like it belongs to a street."
            >
              <Input
                id="district"
                name="district"
                defaultValue={profile.district ?? ""}
              />
            </Row>
            <Row label="Address" htmlFor="address" className="sm:col-span-2">
              <Input
                id="address"
                name="address"
                defaultValue={profile.address ?? ""}
              />
            </Row>
            <Row
              label="Short description"
              htmlFor="description"
              className="sm:col-span-2"
              hint="Two sentences. What you serve, what the room is like, what people come back for."
            >
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={profile.description}
                required
              />
            </Row>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Voice"
            description="How replies are allowed to sound, and the words that are off limits."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Row
              label="Tone"
              htmlFor="tone"
              hint={toneHints[profile.tone]}
            >
              <select
                id="tone"
                name="tone"
                defaultValue={profile.tone}
                className={selectClass}
              >
                {(Object.keys(toneLabels) as ToneKey[]).map((tone) => (
                  <option key={tone} value={tone}>
                    {toneLabels[tone]}
                  </option>
                ))}
              </select>
            </Row>
            <Row
              label="Emoji"
              htmlFor="emojiPolicy"
              hint={emojiPolicyHints[profile.emojiPolicy]}
            >
              <select
                id="emojiPolicy"
                name="emojiPolicy"
                defaultValue={profile.emojiPolicy}
                className={selectClass}
              >
                {(Object.keys(emojiPolicyLabels) as EmojiPolicy[]).map(
                  (policy) => (
                    <option key={policy} value={policy}>
                      {emojiPolicyLabels[policy]}
                    </option>
                  ),
                )}
              </select>
            </Row>
            <Row
              label="Sign off"
              htmlFor="signOff"
              hint="Used on serious complaints. Left off short positive replies."
            >
              <Input
                id="signOff"
                name="signOff"
                defaultValue={profile.signOff}
              />
            </Row>
            <Row
              label="Tone descriptors, one per line"
              htmlFor="toneDescriptors"
            >
              <Textarea
                id="toneDescriptors"
                name="toneDescriptors"
                rows={4}
                defaultValue={profile.toneDescriptors.join("\n")}
              />
            </Row>
            <Row
              label="Preferred words and phrases, one per line"
              htmlFor="preferredWords"
            >
              <Textarea
                id="preferredWords"
                name="preferredWords"
                rows={4}
                defaultValue={profile.preferredWords.join("\n")}
              />
            </Row>
            <Row
              label="Banned phrases, one per line"
              htmlFor="bannedPhrases"
              hint="Checked against every draft. A hit costs the draft 30 quality points."
            >
              <Textarea
                id="bannedPhrases"
                name="bannedPhrases"
                rows={5}
                defaultValue={profile.bannedPhrases.join("\n")}
              />
            </Row>
            <Row
              label="Never mention, one per line"
              htmlFor="doNotMention"
              hint="Subjects a public reply must not touch, whatever the reviewer wrote."
            >
              <Textarea
                id="doNotMention"
                name="doNotMention"
                rows={5}
                defaultValue={profile.doNotMention.join("\n")}
              />
            </Row>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Negative reviews and escalation"
            description="The rule the model follows when the review is bad, and where a complaint goes offline."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Row
              label="Negative review policy"
              htmlFor="negativePolicy"
              className="sm:col-span-2"
            >
              <Textarea
                id="negativePolicy"
                name="negativePolicy"
                rows={3}
                defaultValue={profile.negativePolicy}
                required
              />
            </Row>
            <Row label="Escalation email" htmlFor="escalationEmail">
              <Input
                id="escalationEmail"
                name="escalationEmail"
                type="email"
                defaultValue={profile.escalationEmail ?? ""}
              />
            </Row>
            <Row label="Escalation phone" htmlFor="escalationPhone">
              <Input
                id="escalationPhone"
                name="escalationPhone"
                defaultValue={profile.escalationPhone ?? ""}
              />
            </Row>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Approval policy"
            description="Where the line sits between what the system may draft on its own and what a person has to see."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Row
              label="Auto approve from this rating up"
              htmlFor="autoApproveMinStars"
              hint="Anything below always goes to the queue."
            >
              <select
                id="autoApproveMinStars"
                name="autoApproveMinStars"
                defaultValue={String(profile.approvalSettings.autoApproveMinStars)}
                className={selectClass}
              >
                {[5, 4, 3].map((value) => (
                  <option key={value} value={value}>
                    {value} stars and above
                  </option>
                ))}
              </select>
            </Row>
            <Row
              label="Drafts per generation"
              htmlFor="draftsPerGeneration"
              hint="More options cost more tokens and more reading time."
            >
              <select
                id="draftsPerGeneration"
                name="draftsPerGeneration"
                defaultValue={String(profile.approvalSettings.draftsPerGeneration)}
                className={selectClass}
              >
                {[1, 2, 3].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Row>
            <Row
              label="Risk flags force a human"
              htmlFor="requireApprovalWhenRiskFlagged"
              className="sm:col-span-2"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  id="requireApprovalWhenRiskFlagged"
                  name="requireApprovalWhenRiskFlagged"
                  type="checkbox"
                  defaultChecked={
                    profile.approvalSettings.requireApprovalWhenRiskFlagged
                  }
                  className="size-4 rounded border-input"
                />
                Any flagged review needs approval, even a five star one
              </label>
            </Row>
            <Row
              label="Approval before publishing"
              htmlFor="requireApprovalBeforePublish"
              className="sm:col-span-2"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  id="requireApprovalBeforePublish"
                  name="requireApprovalBeforePublish"
                  type="checkbox"
                  defaultChecked={
                    profile.approvalSettings.requireApprovalBeforePublish
                  }
                  className="size-4 rounded border-input"
                />
                Nothing publishes without an approval record
              </label>
            </Row>
            <Row
              label="Primary reply language"
              htmlFor="primaryLanguage"
              hint="Replies still mirror the reviewer when the review is in another supported language."
            >
              <select
                id="primaryLanguage"
                name="primaryLanguage"
                defaultValue={profile.primaryLanguage}
                className={selectClass}
              >
                <option value="pl">Polish</option>
                <option value="en">English</option>
              </select>
            </Row>
          </div>
        </Panel>
      </fieldset>

      {!readOnly && (
        <div className="flex items-center justify-end gap-3">
          <p className="text-xs text-muted-foreground">
            Changes apply to the next generation, not to drafts already written.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save brand settings"}
          </Button>
        </div>
      )}
    </form>
  );
}
