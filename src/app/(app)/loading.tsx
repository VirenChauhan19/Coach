// Shown instantly while a route's server data loads (Next.js Suspense fallback).
// The sidebar stays put, only this content area swaps to a shimmer skeleton, 
// so navigation feels immediate even when the database is slow to respond.
export default function Loading() {
  return (
    <div className="animate-fade-in">
      {/* page header */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton mt-3 h-8 w-52 max-w-full rounded-md" />
          <div className="skeleton mt-3 h-3.5 w-72 max-w-full rounded" />
        </div>
        <div className="skeleton hidden h-10 w-32 rounded-md sm:block" />
      </div>

      {/* stat row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-lg" />
        ))}
      </div>

      {/* main panels */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="skeleton h-72 rounded-lg lg:col-span-2" />
        <div className="skeleton h-72 rounded-lg" />
      </div>
    </div>
  );
}
