import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logApplyActivity, requireFounder, statusLabel } from "@/lib/apply-admin";
import ApplyAdminControls from "@/components/ApplyAdminControls";

export const dynamic = "force-dynamic";

export default async function AdminApplyDetail({ params }: { params: { id: string } }) {
  const founder = await requireFounder();
  if (!founder) {
    return <div className="page-container py-16"><h1 className="section-title">403 Forbidden</h1><p className="mt-2 text-sm text-gray-600">This account cannot open this request.</p></div>;
  }
  const request = await prisma.applyRequest.findUnique({
    where: { id: params.id },
    include: {
      student: { select: { name: true, email: true, phone: true, nationality: true, degree: true, major: true, academicLevel: true, currentUniversity: true, createdAt: true } },
      items: { include: { university: { select: { name: true, city: true, country: true, applicationUrl: true, applicationDeadline: true } } } },
      documents: { orderBy: { createdAt: "asc" }, select: { id: true, kind: true, name: true, size: true, createdAt: true, storageProvider: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 40 },
    },
  });
  if (!request) notFound();
  await logApplyActivity(request.id, "founder_opened", founder.id);

  return (
    <div className="page-container py-8">
      <Link href="/admin/apply" className="text-sm text-[var(--teal)]">Back to requests</Link>
      <h1 className="section-title mt-2">{request.student.name || "Student"}</h1>
      <p className="text-sm text-gray-600">{statusLabel(request.status)} · {request.paymentStatus}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold text-[var(--navy)]">Student</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div>Email: {request.student.email}</div>
            <div>Phone: {request.student.phone || "Not stored"}</div>
            <div>Nationality: {request.student.nationality || "Not stored"}</div>
            <div>Level: {[request.student.academicLevel, request.student.degree, request.student.major].filter(Boolean).join(" · ") || "Not stored"}</div>
            <div>Current university: {request.student.currentUniversity || "Not stored"}</div>
            <div>Account created: {request.student.createdAt.toISOString().slice(0, 10)}</div>
          </dl>
          {request.studentNote && <p className="mt-3 text-sm text-gray-600">Student note: {request.studentNote}</p>}
        </section>
        <section className="card p-4">
          <h2 className="font-semibold text-[var(--navy)]">Payment</h2>
          <p className="mt-2 text-sm">Package: {request.package === "intro" ? "Three applications" : request.package}</p>
          <p className="text-sm">Price: ${(request.feeCents / 100).toFixed(0)}</p>
          <p className={`mt-2 inline-block rounded-full px-2 py-1 text-xs ${request.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{request.paymentStatus}</p>
          <p className="mt-2 text-sm">Reference: {request.paymentRef || "None"}</p>
          <p className="text-sm">Paid at: {request.paymentAt ? request.paymentAt.toISOString().slice(0, 16).replace("T", " ") : "Not recorded"}</p>
        </section>
        <section className="card p-4 lg:col-span-2">
          <h2 className="font-semibold text-[var(--navy)]">Applications</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {request.items.map((item) => (
              <li key={item.id} className="rounded-md border border-[var(--gray-200)] p-3">
                <p className="font-medium text-[var(--navy)]">{item.university.name}</p>
                <p className="text-gray-600">{[item.university.city, item.university.country].filter(Boolean).join(", ") || "Location not stored"}</p>
                <p>Program: not selected on this request.</p>
                <p>Status: {statusLabel(item.status)}</p>
                {item.university.applicationUrl && <p><a className="text-[var(--teal)]" href={item.university.applicationUrl}>Stored application URL</a></p>}
                <p>Deadline: {item.university.applicationDeadline || "Not stored"}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-4">
          <h2 className="font-semibold text-[var(--navy)]">Documents</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {request.documents.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{document.kind}: {document.name} · {Math.ceil(document.size / 1024)} KB · {document.createdAt.toISOString().slice(0, 10)} · {document.storageProvider}</span>
                <a className="btn-secondary text-xs" href={`/api/admin/apply/documents/${document.id}?requestId=${request.id}`}>Download</a>
              </li>
            ))}
            {request.documents.length === 0 && <li className="text-gray-500">No documents uploaded.</li>}
          </ul>
        </section>
        <section className="card p-4">
          <h2 className="font-semibold text-[var(--navy)]">Founder notes and progress</h2>
          <div className="mt-3">
            <ApplyAdminControls requestId={request.id} status={request.status} founderNote={request.founderNote || ""} items={request.items.map((item) => ({ id: item.id, status: item.status, preparationNote: item.preparationNote || "" }))} />
          </div>
        </section>
        <section className="card p-4 lg:col-span-2">
          <h2 className="font-semibold text-[var(--navy)]">Activity</h2>
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            {request.activities.map((activity) => <li key={activity.id}>{activity.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {activity.action.replaceAll("_", " ")}{activity.meta ? ` · ${activity.meta}` : ""}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
