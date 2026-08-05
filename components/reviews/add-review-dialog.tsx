"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { addReviewAction, type ActionResult } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sourceLabels } from "@/lib/labels";
import type { ReviewSource } from "@/types/domain";

const SOURCES: ReviewSource[] = ["google", "tripadvisor", "facebook", "manual"];

export function AddReviewDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(addReviewAction, null);
  const [handled, setHandled] = useState<ActionResult | null>(null);

  // A successful save closes the dialog. Adjusting during render rather than in
  // an effect keeps it to a single pass.
  if (state && state !== handled) {
    setHandled(state);
    if (state.ok) setOpen(false);
  }

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      if (state.reviewId) router.push(`/reviews?review=${state.reviewId}`);
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-3.5" />
        Add review
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Add a review</DialogTitle>
            <DialogDescription>
              Paste it exactly as it appears. Classification, risk flags and the
              approval decision run the moment you save.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="source">Source</Label>
                <select
                  id="source"
                  name="source"
                  defaultValue="google"
                  className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {sourceLabels[source]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reviewerName">Reviewer name</Label>
                <Input
                  id="reviewerName"
                  name="reviewerName"
                  placeholder="Leave empty if anonymous"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stars">Rating</Label>
              <input type="hidden" name="stars" value={stars} />
              <div className="flex items-center gap-1" id="stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={stars === value}
                    aria-label={`${value} stars`}
                    onClick={() => setStars(value)}
                    className={
                      stars === value
                        ? "h-9 w-10 rounded-md border border-brand/40 bg-brand-soft text-sm font-medium text-brand"
                        : "h-9 w-10 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground"
                    }
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reviewText">Review text</Label>
              <Textarea
                id="reviewText"
                name="reviewText"
                rows={5}
                required
                placeholder="Kawa dobra, ale muzyka byla tak glosna, ze nie dalo sie rozmawiac."
              />
              <p className="text-xs text-muted-foreground">
                Polish and English are detected automatically. The reply comes
                back in the language of the review.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save and triage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
