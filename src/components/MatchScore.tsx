type Breakdown = {
  interestOverlap: number;
  areaOverlap: number;
  topicOverlap: number;
  majorRelevance: number;
  degreeRelevance: number;
  publicationOverlap?: number | null;
};

function band(score: number) {
  if (score >= 90) return { label: "Strong match", tone: "text-[var(--ok)] bg-[var(--ok-bg)]" };
  if (score >= 75) return { label: "Good match", tone: "text-[var(--teal-dark)] bg-[var(--light-teal)]" };
  if (score >= 60) return { label: "Moderate match", tone: "text-[var(--warn)] bg-[var(--warn-bg)]" };
  return { label: "Limited match", tone: "text-[var(--gray-700)] bg-[var(--gray-100)]" };
}

export default function MatchScore({
  score,
  breakdown,
  reasons,
  compact = false,
}: {
  score: number;
  breakdown?: Breakdown | null;
  reasons?: string[];
  compact?: boolean;
}) {
  const tone = band(score);
  const rows = breakdown
    ? [
        ["Research overlap", breakdown.interestOverlap],
        ["Area overlap", breakdown.areaOverlap],
        ["Topic overlap", breakdown.topicOverlap],
        ["Stored publications", breakdown.publicationOverlap ?? null],
        ["Major relevance", breakdown.majorRelevance],
        ["Degree on file", breakdown.degreeRelevance],
      ]
    : [];

  if (compact) {
    return (
      <div className="match-pop text-right">
        <p className="text-xl font-semibold text-[var(--navy)]">{score}%</p>
        <p className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${tone.tone}`}>{tone.label}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--gray-500)]">Research match</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold text-[var(--navy)]">{score}%</p>
        <p className={`rounded-md px-2 py-1 text-xs font-medium ${tone.tone}`}>{tone.label}</p>
      </div>
      {rows.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rows.map(([label, value]) => (
            <li key={String(label)}>
              <div className="flex justify-between text-xs text-[var(--gray-700)]">
                <span>{label}</span>
                <span>{value == null ? "Not on file" : `${value}%`}</span>
              </div>
              {value != null && (
                <div className="mt-1 h-1.5 rounded-full bg-[var(--gray-100)]">
                  <div className="meter-fill h-1.5 rounded-full bg-[var(--teal)]" style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {reasons && reasons.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-[var(--gray-500)]">Why this match?</p>
          <ul className="mt-1 space-y-1 text-sm text-[var(--gray-700)]">
            {reasons.slice(0, 4).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
