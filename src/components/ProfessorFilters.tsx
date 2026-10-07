"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Option = { id: string; name: string };
type Discipline = Option & { academicFieldId: string };
type Major = Option & { disciplineId: string };
type University = Option & { country: string };

export type ProfessorFilterValues = {
  q: string;
  area: string;
  university: string;
  department: string;
  field: string;
  discipline: string;
  major: string;
  country: string;
  verified: boolean;
  email: boolean;
  papers: boolean;
  funding: string;
};

type Props = {
  values: ProfessorFilterValues;
  fields: Option[];
  disciplines: Discipline[];
  majors: Major[];
  universities: University[];
  areas: string[];
  countries: string[];
  activeCount: number;
  children: ReactNode;
};

export default function ProfessorFilters({
  values,
  fields,
  disciplines,
  majors,
  universities,
  areas,
  countries,
  activeCount,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState(values.field);
  const [discipline, setDiscipline] = useState(values.discipline);
  const [major, setMajor] = useState(values.major);
  const [country, setCountry] = useState(values.country);
  const [university, setUniversity] = useState(values.university);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const disciplineOptions = useMemo(
    () => disciplines.filter((row) => !field || row.academicFieldId === field || row.id === discipline),
    [disciplines, field]
  );
  const majorOptions = useMemo(() => {
    if (discipline) return majors.filter((row) => row.disciplineId === discipline || row.id === major);
    if (field) {
      const allowed = new Set(disciplineOptions.map((row) => row.id));
      return majors.filter((row) => allowed.has(row.disciplineId) || row.id === major);
    }
    return majors;
  }, [majors, discipline, field, disciplineOptions]);
  const universityOptions = useMemo(
    () => universities.filter((row) => !country || row.country === country || row.id === university),
    [universities, country]
  );

  function onField(next: string) {
    setField(next);
    if (discipline && !disciplines.some((row) => row.id === discipline && (!next || row.academicFieldId === next))) {
      setDiscipline("");
    }
    if (major) {
      const majorRow = majors.find((row) => row.id === major);
      const parent = majorRow ? disciplines.find((row) => row.id === majorRow.disciplineId) : undefined;
      if (next && parent && parent.academicFieldId !== next) setMajor("");
    }
  }

  function onDiscipline(next: string) {
    setDiscipline(next);
    if (major && !majors.some((row) => row.id === major && (!next || row.disciplineId === next))) setMajor("");
  }

  function onCountry(next: string) {
    setCountry(next);
    if (university && !universities.some((row) => row.id === university && (!next || row.country === next))) setUniversity("");
  }

  const panel = `${open ? "fixed inset-0 z-50 block overflow-y-auto bg-white p-4" : "hidden"} lg:static lg:z-auto lg:block lg:overflow-visible lg:bg-transparent lg:p-0`;

  return (
    <form action="/professors" method="get" onSubmit={() => setOpen(false)} className="lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      {open && (
        <button type="button" className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" aria-label="Close filters" onClick={() => setOpen(false)} />
      )}
      <aside className={panel} aria-label="Professor filters" {...(open ? { role: "dialog", "aria-modal": true } : {})}>
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <p className="text-sm font-semibold text-[var(--navy)]">Filters</p>
          <button ref={closeRef} type="button" className="btn-ghost" onClick={() => setOpen(false)}>Close</button>
        </div>
        <div className="space-y-3 rounded-lg border border-[var(--gray-200)] bg-white p-4">
          {countries.length > 0 && (
            <label className="block text-xs font-medium text-[var(--gray-700)]">
              Country
              <select name="country" className="input mt-1" value={country} onChange={(e) => onCountry(e.target.value)}>
                <option value="">Any country</option>
                {countries.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          )}
          <label className="block text-xs font-medium text-[var(--gray-700)]">
            University
            <select name="university" className="input mt-1" value={university} onChange={(e) => setUniversity(e.target.value)}>
              <option value="">Any university</option>
              {universityOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {fields.length > 0 && (
            <label className="block text-xs font-medium text-[var(--gray-700)]">
              Academic field
              <select name="field" className="input mt-1" value={field} onChange={(e) => onField(e.target.value)}>
                <option value="">Any field</option>
                {fields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          {disciplines.length > 0 && (
            <label className="block text-xs font-medium text-[var(--gray-700)]">
              Discipline
              <select name="discipline" className="input mt-1" value={discipline} onChange={(e) => onDiscipline(e.target.value)}>
                <option value="">Any discipline</option>
                {disciplineOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          {majors.length > 0 && (
            <label className="block text-xs font-medium text-[var(--gray-700)]">
              Major
              <select name="major" className="input mt-1" value={major} onChange={(e) => setMajor(e.target.value)}>
                <option value="">Any major</option>
                {majorOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          {areas.length > 0 && (
            <label className="block text-xs font-medium text-[var(--gray-700)]">
              Research area
              <select name="area" className="input mt-1" defaultValue={values.area}>
                <option value="">Any research area</option>
                {areas.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          )}
          <label className="block text-xs font-medium text-[var(--gray-700)]">
            Department
            <input name="department" className="input mt-1" defaultValue={values.department} placeholder="Department name" />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--gray-700)]">
            <input type="checkbox" name="verified" value="1" defaultChecked={values.verified} />
            Verified only
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--gray-700)]">
            <input type="checkbox" name="email" value="1" defaultChecked={values.email} />
            Email available
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--gray-700)]">
            <input type="checkbox" name="papers" value="1" defaultChecked={values.papers} />
            Has stored publications
          </label>
          {values.funding ? <input type="hidden" name="funding" value={values.funding} /> : null}
          <button type="submit" className="btn-primary w-full">Show professors</button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="professor-q">Search professors</label>
          <input id="professor-q" name="q" defaultValue={values.q} placeholder="Search professors, research, universities..." className="input py-3 text-base" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Search</button>
            <button type="button" className="btn-secondary lg:hidden" aria-expanded={open} onClick={() => setOpen(true)}>
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          </div>
        </div>
        {children}
      </div>
    </form>
  );
}
