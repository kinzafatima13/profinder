export default function UniversitiesLoading() {
  return (
    <div className="page-container py-10" aria-busy="true" aria-live="polite">
      <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-100" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-lg border border-gray-100 bg-gray-50" />
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">Loading universities…</p>
    </div>
  );
}
