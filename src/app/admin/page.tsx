import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminReview from "@/components/AdminReview";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email || "";
  const student = email ? await prisma.student.findUnique({ where: { email }, select: { role: true } }) : null;
  const allow = student?.role === "admin" || (process.env.ADMIN_EMAILS || "").split(",").map((v) => v.trim()).includes(email);
  if (!allow) {
    return <div className="page-container py-16"><h1 className="section-title">Admin only</h1><p className="mt-2 text-gray-600">This account cannot view data operations.</p></div>;
  }

  const [universities, programs, fields, majors, professors, verifiedProfessors, pendingPrograms, unverifiedPrograms, changes] = await Promise.all([
    prisma.university.count(),
    prisma.program.count(),
    prisma.academicField.count(),
    prisma.major.count(),
    prisma.professor.count(),
    prisma.professor.count({ where: { dataStatus: "verified" } }),
    prisma.program.count({ where: { verificationStatus: "PENDING_REVIEW" } }),
    prisma.program.count({ where: { verificationStatus: "UNVERIFIED" } }),
    prisma.changeLog.findMany({ orderBy: { detectedAt: "desc" }, take: 8 }),
  ]);
  const stats = [
    ["Universities", universities],
    ["Programs", programs],
    ["Academic fields", fields],
    ["Majors", majors],
    ["Professors", professors],
    ["Verified professors", verifiedProfessors],
    ["Pending programs", pendingPrograms],
    ["Unverified programs", unverifiedPrograms],
  ];

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Admin</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-600">Counts come from the live database. Official imports are marked from their source file. Seeded technology programs stay unverified until an official page is checked.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--navy)]">{value}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 text-lg font-semibold text-[var(--navy)]">Recent source changes</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {changes.map((row) => (
          <li key={row.id} className="card p-3">
            <span className="font-medium">{row.changeType}</span>
            <span className="ml-2 text-gray-500">{row.entityType}</span>
            {row.sourceUrl && <a className="ml-2 text-[var(--teal)]" href={row.sourceUrl}>source</a>}
          </li>
        ))}
        {changes.length === 0 && <li className="text-gray-500">No source changes recorded yet. Run the academic sync.</li>}
      </ul>
      <AdminReview />
    </div>
  );
}
