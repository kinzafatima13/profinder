"use client";

import Link from "next/link";

export default function UniversityRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-container py-16">
      <h1 className="section-title">Something went wrong loading this university.</h1>
      <p className="mt-3 max-w-xl text-sm text-gray-600">
        The page could not be rendered. Try again. If this keeps happening, the university list is still available.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => reset()} className="btn-primary">Try again</button>
        <Link href="/universities" className="text-sm font-medium text-[var(--teal-dark)]">Back to universities</Link>
      </div>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-6 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-900">{error.message}{error.digest ? `\nDigest: ${error.digest}` : ""}</pre>
      )}
    </div>
  );
}
