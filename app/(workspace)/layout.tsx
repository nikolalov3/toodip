import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

export default async function WorkspaceLayout({
  children,
}: LayoutProps<"/">) {
  const session = await requireSession();
  const repo = await getRepository();
  const [tenant, profile] = await Promise.all([
    repo.getTenant(),
    repo.getBusinessProfile(),
  ]);

  return (
    <AppShell session={session} tenant={tenant} profile={profile}>
      {children}
    </AppShell>
  );
}
