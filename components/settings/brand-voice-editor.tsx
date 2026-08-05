"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  updateBrandVoiceAction,
  type SettingsResult,
} from "@/app/actions/settings";
import { Panel, PanelHeader } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { brandVoiceExampleLabels } from "@/lib/labels";
import type { BrandVoiceExample, BrandVoiceExampleType } from "@/types/domain";

interface Row {
  exampleType: BrandVoiceExampleType;
  content: string;
}

export function BrandVoiceEditor({
  examples,
  readOnly,
}: {
  examples: BrandVoiceExample[];
  readOnly: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(
    examples.map((example) => ({
      exampleType: example.exampleType,
      content: example.content,
    })),
  );
  const [state, formAction, pending] = useActionState<
    SettingsResult | null,
    FormData
  >(updateBrandVoiceAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  const payload = JSON.stringify(
    rows
      .filter((row) => row.content.trim())
      .map((row) => ({
        exampleType: row.exampleType,
        content: row.content.trim(),
      })),
  );

  return (
    <Panel>
      <PanelHeader
        title="Brand voice training"
        description="Replies this venue already approved. The model matches their register instead of inventing one."
        action={
          !readOnly && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { exampleType: "positive_reply", content: "" },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add example
            </Button>
          )
        }
      />

      <form action={formAction}>
        <input type="hidden" name="items" value={payload} />

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            No examples yet. Paste three or four replies the owner already likes.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row, index) => (
              <li key={index} className="flex gap-2 px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={row.exampleType}
                      disabled={readOnly}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  exampleType: event.target
                                    .value as BrandVoiceExampleType,
                                }
                              : item,
                          ),
                        )
                      }
                      aria-label={`Example type ${index + 1}`}
                      className="h-7 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {(
                        Object.keys(
                          brandVoiceExampleLabels,
                        ) as BrandVoiceExampleType[]
                      ).map((type) => (
                        <option key={type} value={type}>
                          {brandVoiceExampleLabels[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Textarea
                    value={row.content}
                    disabled={readOnly}
                    rows={2}
                    aria-label={`Example content ${index + 1}`}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, content: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="mt-2 text-sm"
                  />
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove example ${index + 1}`}
                    onClick={() =>
                      setRows((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!readOnly && (
          <div className="flex justify-end border-t border-border px-4 py-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving..." : "Save brand voice"}
            </Button>
          </div>
        )}
      </form>
    </Panel>
  );
}
