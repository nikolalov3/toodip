import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState, Panel } from "@/components/common/surfaces";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";

export default async function WorkspaceNotFound() {
  // Memoized per request: the layout has already resolved the session.
  const session = await getSession().catch(() => null);
  return (
    <Panel>
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="There is nothing at this address. It may have moved, or the link is out of date."
        action={
          <Link href={session?.homePath ?? "/"} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Back to the panel
          </Link>
        }
      />
    </Panel>
  );
}
