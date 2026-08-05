"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  updateKeywordBankAction,
  type SettingsResult,
} from "@/app/actions/settings";
import { Panel, PanelHeader } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { keywordTypeLabels } from "@/lib/labels";
import type { KeywordBankItem, KeywordType } from "@/types/domain";

interface Row {
  phrase: string;
  type: KeywordType;
  active: boolean;
  usageCount: number;
}

export function KeywordBankEditor({
  items,
  readOnly,
}: {
  items: KeywordBankItem[];
  readOnly: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(
    items.map((item) => ({
      phrase: item.phrase,
      type: item.type,
      active: item.active,
      usageCount: item.usageCount,
    })),
  );
  const [state, formAction, pending] = useActionState<
    SettingsResult | null,
    FormData
  >(updateKeywordBankAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const payload = JSON.stringify(
    rows
      .filter((row) => row.phrase.trim())
      .map((row) => ({
        phrase: row.phrase.trim(),
        type: row.type,
        active: row.active,
      })),
  );

  return (
    <Panel>
      <PanelHeader
        title="Keyword bank"
        description="At most one phrase reaches a reply, and the least used one wins. That is what keeps a profile from reading like a keyword list."
        action={
          !readOnly && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { phrase: "", type: "local", active: true, usageCount: 0 },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add phrase
            </Button>
          )
        }
      />

      <form action={formAction}>
        <input type="hidden" name="items" value={payload} />

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            No phrases yet. Add the ones customers actually search for, not the
            ones that sound impressive.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center gap-2 px-4 py-2.5"
              >
                <Input
                  value={row.phrase}
                  disabled={readOnly}
                  onChange={(event) =>
                    update(index, { phrase: event.target.value })
                  }
                  placeholder="kawiarnia na Kazimierzu"
                  aria-label={`Phrase ${index + 1}`}
                  className="h-8 min-w-48 flex-1 text-sm"
                />
                <select
                  value={row.type}
                  disabled={readOnly}
                  onChange={(event) =>
                    update(index, { type: event.target.value as KeywordType })
                  }
                  aria-label={`Type for phrase ${index + 1}`}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {(Object.keys(keywordTypeLabels) as KeywordType[]).map(
                    (type) => (
                      <option key={type} value={type}>
                        {keywordTypeLabels[type]}
                      </option>
                    ),
                  )}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={row.active}
                    disabled={readOnly}
                    onChange={(event) =>
                      update(index, { active: event.target.checked })
                    }
                    className="size-3.5 rounded border-input"
                  />
                  Active
                </label>
                <span
                  className="w-16 text-right text-xs text-muted-foreground"
                  title="Times this phrase appeared in a published reply"
                >
                  used {row.usageCount}
                </span>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove phrase ${index + 1}`}
                    onClick={() =>
                      setRows((current) =>
                        current.filter((_, i) => i !== index),
                      )
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
              {pending ? "Saving..." : "Save keyword bank"}
            </Button>
          </div>
        )}
      </form>
    </Panel>
  );
}
