export default function ProfessorsLoading() {
  return (
    <div className="page-container py-8" aria-busy="true" aria-live="polite">
      <div className="skeleton h-12 w-full max-w-xl rounded-md" />
      <div className="mt-6 skeleton h-8 w-56 rounded-md" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton h-44 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
