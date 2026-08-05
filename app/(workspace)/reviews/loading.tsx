import { Panel } from "@/components/common/surfaces";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 pb-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-24" />
        ))}
      </div>
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
