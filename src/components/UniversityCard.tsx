import Link from "next/link";

type Props = {
  id: string;
  name: string;
  nameZh?: string | null;
  city?: string | null;
  province?: string | null;
  description?: string | null;
  agencyNumber?: string | null;
  professorCount?: number;
  programCount?: number;
};

export default function UniversityCard({
  id,
  name,
  nameZh,
  city,
  province,
  description,
  agencyNumber,
  professorCount,
  programCount,
}: Props) {
  return (
    <Link href={`/universities/${id}`} className="card block p-5 hover:border-[var(--teal)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--navy)]">{name}</h3>
          {nameZh && <p className="text-sm text-gray-400">{nameZh}</p>}
          <p className="mt-1 text-sm text-gray-500">
            {[city, province, "China"].filter(Boolean).join(" · ")}
          </p>
        </div>
        {agencyNumber && (
          <span className="badge-navy shrink-0">Agency {agencyNumber}</span>
        )}
      </div>

      {description && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-600">{description}</p>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--gray-500)]">
        <span>
          {typeof programCount === "number" ? `${programCount} programs` : "Programs not counted"}
          {typeof professorCount === "number" ? ` · ${professorCount} professors` : ""}
        </span>
        <span className="font-medium text-[var(--teal-dark)]">View university</span>
      </div>
    </Link>
  );
}
