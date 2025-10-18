export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Page Header Skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
        <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
      </div>
      
      {/* Filters/Actions Skeleton */}
      <div className="flex gap-4 mb-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg"></div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
      </div>
      
      {/* Table Skeleton */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 rounded"></div>
            <div className="h-4 w-40 bg-slate-200 rounded"></div>
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
          </div>
        </div>
        
        {/* Table Rows */}
        <div className="space-y-3 p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-2">
              <div className="h-4 w-20 bg-slate-200 rounded"></div>
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
              <div className="h-4 w-40 bg-slate-200 rounded"></div>
              <div className="h-4 w-28 bg-slate-200 rounded"></div>
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
