"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ReviewDrawer({
  closeHref,
  title,
  description,
  children,
}: {
  closeHref: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false });
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-2xl!"
        aria-label="Review detail"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-sm">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto bg-background p-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
