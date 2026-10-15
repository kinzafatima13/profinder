import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireFounder, statusLabel } from "@/lib/apply-admin";

export const dynamic = "force-dynamic";

export default async function AdminApplyDetailPage({ params }: { params: { id: string } }) {
  const founder = await requireFounder();
  if (!founder) {
    return <div className="page-container py-16"><h1 className="section-title">403 Forbidden</h1></div>;
  }
  const request = await prisma.applyRequest.findUnique({
    where: { id: params.id },
    include: {
      student: { select: { name: true, email: true } },
      items: { include: { university: { select: { name: true } } } },
      documents: true,
    },
  });
  if (!request) return <div className="page-container py-16"><h1 className="section-title">Not found</h1></div>;

  return (
    <div className="page-container py-8">
      <Link href="/admin/apply" className="text-sm text-[var(--teal)]">← Back to requests</Link>
      <h1 className="section-title mt-2">{request.student.name || "Student"}</h1>
      <p className="text-sm text-gray-600">{request.student.email}</p>
      <p className="mt-1 text-sm">Status: {statusLabel(request.status)} · Payment: {request.paymentStatus}</p>
      <h2 className="mt-6 text-lg font-semibold">Universities</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {request.items.map((item) => <li key={item.id}>{item.university.name}</li>)}
      </ul>
      <h2 className="mt-6 text-lg font-semibold">Documents ({request.documents.length})</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {request.documents.map((doc) => (
          <li key={doc.id} className="card p-3 flex items-center justify-between">
            <span>{doc.kind}: {doc.name} ({Math.round(doc.size / 1024)} KB)</span>
            <a className="font-semibold text-[var(--teal)]" href={`/api/admin/apply/documents/${doc.id}?requestId=${request.id}`}>Download</a>
          </li>
        ))}
        {request.documents.length === 0 && <li className="text-gray-500">No documents uploaded yet.</li>}
      </ul>
    </div>
  );
}
