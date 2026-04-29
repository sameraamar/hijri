/**
 * Lightweight page skeleton shown by `Suspense` while a lazy route chunk loads.
 * Pure CSS, no animation libs.
 */
export default function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-slate-100 dark:bg-slate-700/60" />
          ))}
        </div>
      </div>
      <div className="h-32 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
    </div>
  );
}
