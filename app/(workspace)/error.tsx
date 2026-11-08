"use client";

import { AlertTriangle } from "lucide-react";

import { EmptyState, Panel } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";

/**
 * Catches a render or data error inside the workspace. The shell and sidebar
 * stay up (they live in the layout), only the content column is replaced.
 */
export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Panel>
      <EmptyState
        icon={AlertTriangle}
        title="This page could not load"
        description="Something went wrong while loading the data. Try again; if it keeps happening, sign out and back in."
        action={
          <Button size="sm" onClick={() => reset()}>
            Try again
          </Button>
        }
      />
    </Panel>
  );
}
