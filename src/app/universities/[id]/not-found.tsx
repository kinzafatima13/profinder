import Link from "next/link";

export default function UniversityNotFound() {
  return (
    <div className="page-container py-16">
      <h1 className="section-title">University not found</h1>
      <p className="mt-3 max-w-xl text-sm text-gray-600">That university id is not in the stored catalog.</p>
      <Link href="/universities" className="mt-6 inline-block text-sm font-medium text-[var(--teal-dark)]">Back to universities</Link>
    </div>
  );
}
