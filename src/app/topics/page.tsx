"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Area = { id: string; name: string };
type Professor = {
  id: string;
  name: string;
  nameZh: string | null;
  university: string;
  department: string | null;
  verified: boolean;
  email: string | null;
  areas: string[];
};
type Program = { id: string; universityId: string; university: string; degree: string; major: string; deadline: string | null };
type University = { id: string; name: string; city: string | null };

export default function TopicsPage() {
  const [query, setQuery] = useState("Machine Learning");
  const [areas, setAreas] = useState<Area[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(next = query) {
    setLoading(true);
    const res = await fetch(`/api/topics?q=${encodeURIComponent(next)}`);
    const data = await res.json();
    setAreas(data.areas ?? []);
    setProfessors(data.professors ?? []);
    setPrograms(data.programs ?? []);
    setUniversities(data.universities ?? []);
    setLoading(false);
  }

  useEffect(() => {
    search("Machine Learning");
    // The first search is the stored research-area name, not a guessed topic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Research topics</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Search uses research areas, professor interests, and program names already in the database. It does not invent new research directions.
      </p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          search(query);
        }}
      >
        <input className="input sm:max-w-md" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Topic or research area" />
        <button className="btn-primary" type="submit">{loading ? "Searching..." : "Explore"}</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {areas.slice(0, 12).map((area) => (
          <button
            key={area.id}
            type="button"
            className="badge-teal"
            onClick={() => {
              setQuery(area.name);
              search(area.name);
            }}
          >
            {area.name}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section>
          <h2 className="font-semibold text-[var(--navy)]">Universities</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {universities.map((university) => (
              <li key={university.id}>
                <Link className="text-[var(--teal)] hover:underline" href={`/universities/${university.id}`}>{university.name}</Link>
                {university.city ? <span className="text-gray-500"> · {university.city}</span> : null}
              </li>
            ))}
            {universities.length === 0 && <li className="text-gray-500">No university is linked to that search yet.</li>}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-[var(--navy)]">Programs</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {programs.map((program) => (
              <li key={program.id} className="card p-3">
                <Link className="font-medium text-[var(--navy)] hover:text-[var(--teal)]" href={`/universities/${program.universityId}`}>{program.university}</Link>
                <p className="text-gray-600">{program.degree} · {program.major}</p>
                <p className="text-xs text-amber-800">Unverified · {program.deadline || "No date stored"}</p>
              </li>
            ))}
            {programs.length === 0 && <li className="text-gray-500">No stored program name matches.</li>}
          </ul>
        </section>
        <section className="lg:col-span-1">
          <h2 className="font-semibold text-[var(--navy)]">Professors</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {professors.map((professor) => (
              <li key={professor.id} className="card p-3">
                <Link className="font-medium text-[var(--navy)] hover:text-[var(--teal)]" href={`/professors/${professor.id}`}>
                  {professor.name}{professor.nameZh ? ` ${professor.nameZh}` : ""}
                </Link>
                <p className="text-gray-600">{professor.university}{professor.department ? ` · ${professor.department}` : ""}</p>
                {professor.verified && <p className="text-xs font-semibold text-[var(--teal)]">Verified</p>}
                {professor.email && <p className="break-all text-xs text-gray-600">{professor.email}</p>}
              </li>
            ))}
            {professors.length === 0 && <li className="text-gray-500">No stored professor matches that topic.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
