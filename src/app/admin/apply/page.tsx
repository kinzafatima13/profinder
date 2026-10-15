import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireFounder, statusLabel } from "@/lib/apply-admin";

export const dynamic = "force-dynamic";

export default async function AdminApplyPage({ searchParams }: { searchParams: { q?: string; status?: string; payment?: string; page?: string } }) {
  const founder = await requireFounder();
  if (!founder) {
    return <div className="page-container py-16"><h1 className="section-title">403 Forbidden</h1><p className="mt-2 text-sm text-gray-600">This account cannot open Apply for Me operations.</p></div>;
  }
  const q = searchParams.q?.trim() || "";
  const status = searchParams.status?.trim() || "";
  const payment = searchParams.payment?.trim() || "";
  const page = Math.max(1, Number(searchParams.page || 1));
  const take = 20;
  const where = {
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(q ? { student: { OR: [{ name: { contains: q } }, { email: { contains: q } }] } } : {}),
  };
  const [total, requests] = await Promise.all([
    prisma.applyRequest.count({ where }),
    prisma.applyRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        feeCents: true,
        createdAt: true,
        student: { select: { name: true, email: true } },
        _count: { select: { items: true, documents: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="page-container py-8">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--violet)]">Founder</p>
      <h1 className="section-title mt-1">Apply for Me</h1>
      <nav className="mt-3 flex gap-3 text-sm"><Link href="/admin">Overview</Link><Link href="/admin/apply" className="font-semibold text-[var(--navy)]">Requests</Link></nav>
      <form className="mt-5 flex flex-wrap gap-2" action="/admin/apply">
        <input className="input max-w-xs" name="q" defaultValue={q} placeholder="Student name or email" />
        <select className="input max-w-[12rem]" name="status" defaultValue={status}>
          <option value="">Any status</option>
          <option value="draft">New</option>
          <option value="awaiting_payment">Awaiting payment</option>
          <option value="preparing">In progress</option>
          <option value="completed">Completed</option>
        </select>
        <select className="input max-w-[10rem]" name="payment" defaultValue={payment}>
          <option value="">Any payment</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase text-gray-500"><tr><th className="py-2">Student</th><th>Email</th><th>Universities</th><th>Payment</th><th>Documents</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-[var(--gray-200)]">
                <td className="py-2">{request.student.name || "Student"}</td>
                <td>{request.student.email}</td>
                <td>{request._count.items}</td>
                <td>{request.paymentStatus} · ${(request.feeCents / 100).toFixed(0)}</td>
                <td>{request._count.documents}</td>
                <td>{statusLabel(request.status)}</td>
                <td>{request.createdAt.toISOString().slice(0, 10)}</td>
                <td><Link className="font-semibold text-[var(--teal)]" href={`/admin/apply/${request.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <p className="mt-4 text-sm text-gray-500">No requests yet.</p>}
      </div>
      <p className="mt-3 text-xs text-gray-500">Page {page} of {pages}</p>
    </div>
  );
}
