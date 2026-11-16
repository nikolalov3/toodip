import { ASSISTANT_COLOR, AssistantTag, Chip, MiniBar, pct } from "@/components/panel/ui";
import { cn } from "@/lib/utils";
import type { AssistantComparison, ComparisonCell } from "@/services/visibility";

function rate(cell: ComparisonCell): number {
  return cell.runs > 0 ? cell.own / cell.runs : 0;
}

/** A gap worth a flag: both asked at least three times and the rates half apart. */
function split(cells: ComparisonCell[]): number | null {
  if (cells.length < 2 || cells.some((cell) => cell.runs < 3)) return null;
  const rates = cells.map(rate);
  const max = Math.max(...rates);
  const min = Math.min(...rates);
  return max - min >= 0.5 ? rates.indexOf(max) : null;
}

/**
 * The same questions, one column per assistant: where each one names the
 * venue and where only one of them does. Rows are question types (or single
 * questions); a cell is "answers naming you of answers asked".
 */
export function AssistantMatrix({
  comparison,
  rows,
  rowLabel,
  dense,
}: {
  comparison: AssistantComparison;
  rows: Array<{ name: string; note?: string; cells: ComparisonCell[] }>;
  rowLabel: string;
  dense?: boolean;
}) {
  const cols = comparison.columns;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-[13.5px]">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{rowLabel}</th>
            {cols.map((col) => (
              <th key={col.seriesId} className="w-[24%] px-3 py-3 text-[13px] font-semibold">
                <AssistantTag platform={col.platform} name={col.assistant} />
                <span className="text-numeric ml-2 font-medium text-muted-foreground">{pct(col.score)}</span>
              </th>
            ))}
            <th className="w-[92px] px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const winner = split(row.cells);
            return (
              <tr key={row.name} className="border-b border-border/60 last:border-b-0">
                <td className={cn("px-4 align-middle", dense ? "py-2" : "py-3")}>
                  <span className={cn("block", dense ? "text-[13px]" : "font-medium")}>{row.name}</span>
                  {row.note && <span className="block text-[12px] text-muted-foreground">{row.note}</span>}
                </td>
                {row.cells.map((cell, index) => (
                  <td key={cols[index].seriesId} className={cn("px-3 align-middle", dense ? "py-2" : "py-3")}>
                    {cell.runs === 0 ? (
                      <span className="text-[12.5px] text-muted-foreground">not asked</span>
                    ) : (
                      <span className="flex items-center gap-2.5">
                        <MiniBar value={rate(cell)} color={ASSISTANT_COLOR[cols[index].platform]} className="w-16 shrink-0" />
                        <span className={cn("text-numeric font-semibold", cell.own === 0 && "font-medium text-muted-foreground")}>
                          {cell.own}/{cell.runs}
                        </span>
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-3 text-right align-middle">
                  {winner !== null && (
                    <Chip className="bg-caution-soft text-caution" title="Asked at least three times on each, and the rates are half apart or more.">
                      only {cols[winner].assistant.replace(/ AI$/, "")}
                    </Chip>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
