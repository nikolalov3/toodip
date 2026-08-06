import type { Metadata } from "next";

import {
  PasswordForm,
  ProfileNameForm,
} from "@/components/account/account-forms";
import { Field, PageHeader, Panel, PanelHeader } from "@/components/common/surfaces";
import { requireSession } from "@/lib/auth/session";
import { roleLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <>
      <PageHeader
        title="Account"
        description="Your details and the password to this workspace."
      />

      <div className="flex max-w-3xl flex-col gap-4">
        <Panel>
          <PanelHeader title="Signed in as" />
          <dl className="grid gap-4 p-4 sm:grid-cols-3">
            <Field label="Email">{session.email}</Field>
            <Field label="Role">{roleLabels[session.role]}</Field>
            <Field label="Workspace">{session.tenantName}</Field>
          </dl>
        </Panel>

        <ProfileNameForm fullName={session.fullName} />
        <PasswordForm />
      </div>
    </>
  );
}
