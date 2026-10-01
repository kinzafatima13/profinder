import Link from "next/link";

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
};

function matchClass(score: number) {
  if (score >= 75) return "match-high";
  if (score >= 50) return "match-mid";
  return "match-low";
}

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
        </div>
        {typeof matchScore === "number" && (
          <div className="text-right">
            <div className={`text-2xl ${matchClass(matchScore)}`}>
              {matchScore}%
            </div>
            <div className="text-xs text-gray-400">Match</div>
          </div>
        )}
      </div>

      {researchAreas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {researchAreas.slice(0, 4).map((a) => (
            <span key={a} className="badge-teal">
              {a}
            </span>
          ))}
          {researchAreas.length > 4 && (
            <span className="badge-navy">+{researchAreas.length - 4}</span>
          )}
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
