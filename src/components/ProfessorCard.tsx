import Link from "next/link";
import MatchScore from "@/components/MatchScore";

type Props = {
  id: string;
  name: string;
  nameZh?: string | null;
  position?: string | null;
  department?: string | null;
  universityName: string;
  universityCity?: string | null;
  researchAreas: string[];
  researchInterests?: string | null;
  matchScore?: number | null;
  verified?: boolean;
  email?: string | null;
  recent?: string | null;
  priority?: "High" | "Medium" | "Low" | null;
};

export default function ProfessorCard({
  id,
  name,
  nameZh,
  position,
  department,
  universityName,
  universityCity,
  researchAreas,
  researchInterests,
  matchScore,
  verified,
  email,
  recent,
  priority,
}: Props) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/professors/${id}`}
            className="text-lg font-semibold text-[var(--navy)] hover:text-[var(--teal)]"
          >
            {name}
            {nameZh && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {nameZh}
              </span>
            )}
          </Link>
          <p className="mt-0.5 text-sm text-gray-600">
            {position}
            {department && ` · ${department}`}
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            {universityName}
            {universityCity && ` · ${universityCity}`}
          </p>
          {verified ? <p className="mt-2 text-xs font-medium text-[var(--ok)]">Verified</p> : <p className="mt-2 text-xs text-[var(--gray-500)]">Unverified</p>}
          <p className="mt-1 text-xs text-[var(--gray-500)]">{email?.trim() ? "Email on file" : "No public email"}</p>
          <p className="mt-1 text-xs text-[var(--gray-500)]">{recent || "Recent activity not stored"}</p>
          {priority && <p className="mt-1 text-xs text-[var(--gray-500)]">{priority} priority</p>}
        </div>
        {typeof matchScore === "number" && <MatchScore score={matchScore} compact />}
      </div>

      {researchAreas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {researchAreas.slice(0, 4).map((area) => (
            <Link key={area} href={`/professors?area=${encodeURIComponent(area)}`} className="tag">{area}</Link>
          ))}
        </div>
      )}

      {researchInterests && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-600">
          {researchInterests}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/professors/${id}`} className="btn-secondary text-xs">
          View Profile
        </Link>
        <Link
          href={`/professors/${id}?tab=match`}
          className="btn-ghost text-xs"
        >
          Research Match
        </Link>
      </div>
    </div>
  );
}
