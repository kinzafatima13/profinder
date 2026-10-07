export default function UniversityDetailLoading() {
  return (
    <div className="page-container py-10" aria-busy="true" aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 h-9 w-2/3 max-w-xl animate-pulse rounded bg-gray-200" />
      <div className="mt-3 h-4 w-48 animate-pulse rounded bg-gray-100" />
      <div className="mt-8 space-y-2">
        <div className="h-4 w-full max-w-3xl animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-5/6 max-w-2xl animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mt-12 h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 h-40 animate-pulse rounded-xl bg-gray-100" />
      <div className="mt-12 h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-36 animate-pulse rounded-xl bg-gray-100" />
      </div>
      <p className="mt-6 text-sm text-gray-500">Loading university…</p>
    </div>
  );
}
