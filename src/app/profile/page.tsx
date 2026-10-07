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
  englishTest: string | null;
  fundingGoals: string | null;
  plan: string;
  currentUniversity: string | null;
  graduationYear: string | null;
  academicLevel: string | null;
  publications: string | null;
  researchExperience: string | null;
  researchMethods: string | null;
  tools: string | null;
  programmingLanguages: string | null;
  researchKeywords: string | null;
  preferredResearchAreas: string | null;
  targetDegreeLevel: string | null;
  intake: string | null;
  fundingPreference: string | null;
  fullyFundedPreference: string | null;
  scholarshipPreference: string | null;
  ielts: string | null;
  toefl: string | null;
  pte: string | null;
  englishProof: string | null;
  englishTestStatus: string | null;
};

const EMPTY: Profile = {
  name: "",
  email: "",
  degree: "",
  major: "",
  academicBackground: "",
  researchInterests: "",
  skills: "",
  projects: "",
  cvText: "",
  preferredCountries: "",
  preferredUniversities: "",
  gpa: "",
  nationality: "",
  englishTest: "",
  fundingGoals: "",
  plan: "free",
  currentUniversity: "",
  graduationYear: "",
  academicLevel: "",
  publications: "",
  researchExperience: "",
  researchMethods: "",
  tools: "",
  programmingLanguages: "",
  researchKeywords: "",
  preferredResearchAreas: "",
  targetDegreeLevel: "",
  intake: "",
  fundingPreference: "",
  fullyFundedPreference: "",
  scholarshipPreference: "",
  ielts: "",
  toefl: "",
  pte: "",
  englishProof: "",
  englishTestStatus: "",
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
        setProfile({ ...EMPTY, ...data.profile, preferredCountries: data.profile?.preferredCountries ?? "", degree: data.profile?.degree ?? "" });
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
    setProfile({ ...EMPTY, ...data.profile, preferredCountries: data.profile?.preferredCountries ?? "", degree: data.profile?.degree ?? "" });
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

  const degreeValue = profile.degree ?? "";
  const knownDegrees = ["", "Master", "PhD", "Other"];

  return (
    <div className="page-container py-10">
      <h1 className="text-2xl font-semibold text-[var(--navy)]">Profile</h1>
      <p className="mt-1 text-sm text-[var(--gray-700)]">{profile.email}</p>
      <p className="mt-1 max-w-3xl text-sm text-gray-600">Every field except your account email is optional. A saved country or major is kept. Nothing is prefilled with a country.</p>
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
          <input className="input mt-1" value={profile.name ?? ""} onChange={(e) => setField("name", e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Degree
            <select className="input mt-1" value={knownDegrees.includes(degreeValue) ? degreeValue : "Other"} onChange={(e) => setField("degree", e.target.value)}>
              <option value="">Not set</option>
              <option>Master</option>
              <option>PhD</option>
              <option>Other</option>
            </select>
          </label>
          <label className="text-sm">Major or discipline
            <input className="input mt-1" value={profile.major ?? ""} onChange={(e) => setField("major", e.target.value)} placeholder="Any discipline. Optional." />
          </label>
        </div>
        <label className="text-sm">CGPA
          <input className="input mt-1 max-w-xs" value={profile.gpa ?? ""} onChange={(e) => setField("gpa", e.target.value)} placeholder="e.g. 3.41 / 4.00" />
        </label>
        <label className="text-sm">Nationality
          <input className="input mt-1 max-w-xs" value={profile.nationality ?? ""} onChange={(e) => setField("nationality", e.target.value)} placeholder="Optional" />
        </label>
        <label className="text-sm">English test summary
          <input className="input mt-1 max-w-md" value={profile.englishTest ?? ""} onChange={(e) => setField("englishTest", e.target.value)} placeholder="Optional summary. Leave blank if you have not taken one." />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Current university
            <input className="input mt-1" value={profile.currentUniversity ?? ""} onChange={(e) => setField("currentUniversity", e.target.value)} />
          </label>
          <label className="text-sm">Graduation year
            <input className="input mt-1" value={profile.graduationYear ?? ""} onChange={(e) => setField("graduationYear", e.target.value)} placeholder="e.g. 2024" />
          </label>
          <label className="text-sm">Academic level
            <input className="input mt-1" value={profile.academicLevel ?? ""} onChange={(e) => setField("academicLevel", e.target.value)} placeholder="Bachelor, Master, or other" />
          </label>
          <label className="text-sm">Target degree
            <input className="input mt-1" value={profile.targetDegreeLevel ?? ""} onChange={(e) => setField("targetDegreeLevel", e.target.value)} placeholder="Master or PhD" />
          </label>
          <label className="text-sm">Intake
            <input className="input mt-1" value={profile.intake ?? ""} onChange={(e) => setField("intake", e.target.value)} placeholder="e.g. Fall 2027" />
          </label>
        </div>
        <label className="text-sm">Preferred research areas
          <input className="input mt-1" value={profile.preferredResearchAreas ?? ""} onChange={(e) => setField("preferredResearchAreas", e.target.value)} />
        </label>
        <label className="text-sm">Research keywords
          <input className="input mt-1" value={profile.researchKeywords ?? ""} onChange={(e) => setField("researchKeywords", e.target.value)} />
        </label>
        <label className="text-sm">Experience
          <textarea className="input mt-1 min-h-[80px]" value={profile.academicBackground ?? ""} onChange={(e) => setField("academicBackground", e.target.value)} placeholder="Study, work, or research experience" />
        </label>
        <label className="text-sm">Research interests
          <textarea className="input mt-1 min-h-[80px]" value={profile.researchInterests ?? ""} onChange={(e) => setField("researchInterests", e.target.value)} placeholder="Optional. Matching stays incomplete until this is saved." />
        </label>
        <label className="text-sm">Publications
          <textarea className="input mt-1 min-h-[80px]" value={profile.publications ?? ""} onChange={(e) => setField("publications", e.target.value)} placeholder="Only list work you authored. Leave blank if none." />
        </label>
        <label className="text-sm">Research experience
          <textarea className="input mt-1 min-h-[80px]" value={profile.researchExperience ?? ""} onChange={(e) => setField("researchExperience", e.target.value)} />
        </label>
        <label className="text-sm">Skills
          <input className="input mt-1" value={profile.skills ?? ""} onChange={(e) => setField("skills", e.target.value)} />
        </label>
        <label className="text-sm">Research methods
          <input className="input mt-1" value={profile.researchMethods ?? ""} onChange={(e) => setField("researchMethods", e.target.value)} />
        </label>
        <label className="text-sm">Tools
          <input className="input mt-1" value={profile.tools ?? ""} onChange={(e) => setField("tools", e.target.value)} />
        </label>
        <label className="text-sm">Programming languages
          <input className="input mt-1" value={profile.programmingLanguages ?? ""} onChange={(e) => setField("programmingLanguages", e.target.value)} />
        </label>
        <label className="text-sm">Projects
          <textarea className="input mt-1 min-h-[80px]" value={profile.projects ?? ""} onChange={(e) => setField("projects", e.target.value)} />
        </label>
        <label className="text-sm">CV notes (paste text; this is not automatic document parsing)
          <textarea className="input mt-1 min-h-[100px]" value={profile.cvText ?? ""} onChange={(e) => setField("cvText", e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Preferred countries
            <input className="input mt-1" value={profile.preferredCountries ?? ""} onChange={(e) => setField("preferredCountries", e.target.value)} placeholder="Leave blank if you have no preference" />
          </label>
          <label className="text-sm">Funding goals
            <input className="input mt-1" value={profile.fundingGoals ?? ""} onChange={(e) => setField("fundingGoals", e.target.value)} placeholder="e.g. full scholarship, CSC, or self-funded" />
          </label>
          <label className="text-sm">Funding preference
            <input className="input mt-1" value={profile.fundingPreference ?? ""} onChange={(e) => setField("fundingPreference", e.target.value)} placeholder="Fully funded, tuition, stipend, or assistantship" />
          </label>
          <label className="text-sm">Fully funded preference
            <input className="input mt-1" value={profile.fullyFundedPreference ?? ""} onChange={(e) => setField("fullyFundedPreference", e.target.value)} placeholder="Required, preferred, or not required" />
          </label>
          <label className="text-sm">Scholarship preference
            <input className="input mt-1" value={profile.scholarshipPreference ?? ""} onChange={(e) => setField("scholarshipPreference", e.target.value)} />
          </label>
          <label className="text-sm">IELTS
            <input className="input mt-1" value={profile.ielts ?? ""} onChange={(e) => setField("ielts", e.target.value)} />
          </label>
          <label className="text-sm">TOEFL
            <input className="input mt-1" value={profile.toefl ?? ""} onChange={(e) => setField("toefl", e.target.value)} />
          </label>
          <label className="text-sm">PTE
            <input className="input mt-1" value={profile.pte ?? ""} onChange={(e) => setField("pte", e.target.value)} />
          </label>
          <label className="text-sm">Other English proof
            <input className="input mt-1" value={profile.englishProof ?? ""} onChange={(e) => setField("englishProof", e.target.value)} />
          </label>
          <label className="text-sm">English test status
            <input className="input mt-1" value={profile.englishTestStatus ?? ""} onChange={(e) => setField("englishTestStatus", e.target.value)} placeholder="Taken, planned, or exempt" />
          </label>
          <label className="text-sm">Preferred universities
            <input className="input mt-1" value={profile.preferredUniversities ?? ""} onChange={(e) => setField("preferredUniversities", e.target.value)} />
          </label>
        </div>
        <button className="btn-primary w-fit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
      </form>

      <section id="resume" className="mt-10 max-w-3xl rounded-lg border border-[var(--gray-200)] bg-white p-5">
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
