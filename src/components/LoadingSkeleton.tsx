import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export const LoadingSkeleton = ({
  rows = 5,
  columns = 4,
  showHeader = true
}: LoadingSkeletonProps) => {
  return (
    <div className="bg-card border-border rounded-xl shadow-sm overflow-hidden">
      {showHeader && (
        <div className="bg-muted px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex items-center gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className="h-4 flex-1"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSkeleton;
