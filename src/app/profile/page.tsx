"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { scoreProfile } from "@/lib/profile-score";

type AtsCheck = { label: string; score: number; note: string };
type AtsResult = {
  fileName: string;
  preview: string;
  checklist: { score: number; checks: AtsCheck[] };
  ai: { score: number; summary: string; fixes: string[] } | null;
};

type Profile = {
  name: string | null;
  email: string;
  degree: string | null;
  major: string | null;
  academicBackground: string | null;
  researchInterests: string | null;
  skills: string | null;
  projects: string | null;
  cvText: string | null;
  preferredCountries: string | null;
  preferredUniversities: string | null;
  gpa: string | null;
  nationality: string | null;
  plan: string;
};

const EMPTY: Profile = {
  name: "",
  email: "",
  degree: "Master",
  major: "",
  academicBackground: "",
  researchInterests: "",
  skills: "",
  projects: "",
  cvText: "",
  preferredCountries: "China",
  preferredUniversities: "",
  gpa: "",
  nationality: "",
  plan: "free",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [ats, setAts] = useState<AtsResult | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        if (res.status === 401) {
          setError("Sign in to edit your profile.");
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load profile");
        setProfile({ ...EMPTY, ...data.profile });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function setField(key: keyof Profile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    setProfile({ ...EMPTY, ...data.profile });
    setMessage("Profile saved. Matching and email drafts will use this information.");
  }

  async function scoreResume(event: React.FormEvent) {
    event.preventDefault();
    if (!resumeFile) return;
    setResumeBusy(true);
    setResumeError("");
    const body = new FormData();
    body.set("file", resumeFile);
    const res = await fetch("/api/resume", { method: "POST", body });
    const data = await res.json();
    setResumeBusy(false);
    if (!res.ok) {
      setResumeError(data.error || "Could not score that file");
      return;
    }
    setAts(data);
  }

  if (loading) return <div className="page-container py-10 text-gray-500">Loading profile...</div>;
  if (error && !profile.email) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-gray-600">{error}</p>
        <Link href="/login?callbackUrl=/profile" className="btn-primary mt-4 inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-title">Your research profile</h1>
      <p className="mt-1 text-gray-600">Used for research matching and outreach drafts. Email: {profile.email}</p>
      {(() => {
        const fit = scoreProfile(profile);
        return (
          <section className="mt-6 max-w-3xl rounded-xl border border-gray-100 bg-white p-5">
            <p className="text-sm text-gray-500">Profile score</p>
            <p className="text-4xl font-bold text-[var(--navy)]">{fit.score}%</p>
            <p className="mt-2 text-sm text-gray-700">Next: {fit.next}</p>
            <p className="mt-2 text-sm text-gray-600">On file: {fit.strengths.join(", ") || "nothing yet"}.</p>
            <p className="mt-1 text-sm text-amber-800">Missing: {fit.gaps.join(", ") || "none"}.</p>
          </section>
        );
      })()}
      <form onSubmit={save} className="mt-6 grid max-w-3xl gap-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
        <label className="text-sm">Full name
          <input className="input mt-1" value={profile.name ?? ""} onChange={(e) => setField("name", e.target.value)} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Degree
            <select className="input mt-1" value={profile.degree ?? "Master"} onChange={(e) => setField("degree", e.target.value)}>
              <option>Master</option>
              <option>PhD</option>
            </select>
          </label>
          <label className="text-sm">Major
            <input className="input mt-1" value={profile.major ?? ""} onChange={(e) => setField("major", e.target.value)} required />
          </label>
        </div>
        <label className="text-sm">CGPA
          <input className="input mt-1 max-w-xs" value={profile.gpa ?? ""} onChange={(e) => setField("gpa", e.target.value)} placeholder="e.g. 3.41 / 4.00" />
        </label>
        <label className="text-sm">Nationality
          <input className="input mt-1 max-w-xs" value={profile.nationality ?? ""} onChange={(e) => setField("nationality", e.target.value)} placeholder="e.g. Pakistan" />
        </label>
        <label className="text-sm">Academic background
          <textarea className="input mt-1 min-h-[80px]" value={profile.academicBackground ?? ""} onChange={(e) => setField("academicBackground", e.target.value)} />
        </label>
        <label className="text-sm">Research interests
          <textarea className="input mt-1 min-h-[80px]" value={profile.researchInterests ?? ""} onChange={(e) => setField("researchInterests", e.target.value)} required />
        </label>
        <label className="text-sm">Skills
          <input className="input mt-1" value={profile.skills ?? ""} onChange={(e) => setField("skills", e.target.value)} />
        </label>
        <label className="text-sm">Projects
          <textarea className="input mt-1 min-h-[80px]" value={profile.projects ?? ""} onChange={(e) => setField("projects", e.target.value)} />
        </label>
        <label className="text-sm">CV notes (paste text; this is not automatic document parsing)
          <textarea className="input mt-1 min-h-[100px]" value={profile.cvText ?? ""} onChange={(e) => setField("cvText", e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Preferred countries
            <input className="input mt-1" value={profile.preferredCountries ?? ""} onChange={(e) => setField("preferredCountries", e.target.value)} />
          </label>
          <label className="text-sm">Preferred universities
            <input className="input mt-1" value={profile.preferredUniversities ?? ""} onChange={(e) => setField("preferredUniversities", e.target.value)} />
          </label>
        </div>
        <button className="btn-primary w-fit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
      </form>

      <section className="mt-10 max-w-3xl rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="text-lg font-bold text-[var(--navy)]">Resume</h2>
        <p className="mt-1 text-sm text-gray-600">Upload a PDF, DOCX, or TXT file. The text is scored for an application resume. The file is not rewritten.</p>
        <form onSubmit={scoreResume} className="mt-4 space-y-3">
          <input className="input" type="file" accept=".pdf,.docx,.txt,application/pdf" onChange={(event) => setResumeFile(event.target.files?.[0] || null)} required />
          <button className="btn-primary" disabled={resumeBusy}>{resumeBusy ? "Scoring..." : "Upload and score"}</button>
        </form>
        {resumeError && <p className="mt-3 text-sm text-red-700">{resumeError}</p>}
        {ats && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">{ats.fileName}</p>
            <p className="mt-1 text-4xl font-bold text-[var(--navy)]">{ats.ai ? ats.ai.score : ats.checklist.score}%</p>
            <p className="mt-1 text-sm text-gray-600">{ats.ai ? ats.ai.summary : "Checklist score from the extracted text. AI notes are unavailable on this server."}</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {ats.checklist.checks.map((check) => (
                <li key={check.label}>{check.label}: {check.score}% — {check.note}</li>
              ))}
            </ul>
            {ats.ai && ats.ai.fixes.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-gray-700">
                {ats.ai.fixes.map((fix) => (
                  <li key={fix}>Fix — {fix}</li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-gray-500">Text used: {ats.preview}</p>
          </div>
        )}
      </section>
    </div>
  );
}
