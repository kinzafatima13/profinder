import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreResume } from "@/lib/ats";

async function extractText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdf = await import("pdf-parse");
    const parsed = await pdf.default(buffer);
    return parsed.text || "";
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value || "";
  }
  if (name.endsWith(".txt")) return buffer.toString("utf8");
  throw new Error("Upload a PDF, DOCX, or TXT file.");
}

async function aiReview(text: string, major: string | null, interests: string | null) {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "You score a resume for an applicant tracking system. Use only the supplied text. Do not invent jobs, degrees, or papers. Reply with JSON only: {\"score\":0-100,\"summary\":\"one sentence\",\"fixes\":[\"three short fixes\"]}.",
          },
          {
            role: "user",
            content: `Target degree field: ${major || "not provided"}. Interests: ${interests || "not provided"}.\n\nResume text:\n${text.slice(0, 5000)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return null;
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const score = Number(json.score);
    if (!Number.isFinite(score)) return null;
    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      summary: typeof json.summary === "string" ? json.summary.slice(0, 400) : "",
      fixes: Array.isArray(json.fixes) ? json.fixes.filter((item: unknown) => typeof item === "string").slice(0, 3) : [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in to upload a resume." }, { status: 401 });
  const student = await prisma.student.findUnique({ where: { email: session.user.email } });
  if (!student) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a resume file." }, { status: 400 });
  if (file.size > 5_000_000) return NextResponse.json({ error: "File must be under 5 MB." }, { status: 400 });

  let resumeText = "";
  try {
    resumeText = (await extractText(file)).replace(/\s+/g, " ").trim();
  } catch {
    return NextResponse.json({ error: "Could not read that file. Upload a text-based PDF or DOCX." }, { status: 400 });
  }
  if (resumeText.length < 40) {
    return NextResponse.json({ error: "No usable text was found. A scanned image PDF cannot be read." }, { status: 400 });
  }

  await prisma.student.update({ where: { id: student.id }, data: { resumeText: resumeText.slice(0, 8000) } });
  const checklist = scoreResume(resumeText, {
    major: student.major,
    interests: student.researchInterests,
    skills: student.skills,
  });
  const ai = await aiReview(resumeText, student.major, student.researchInterests);

  return NextResponse.json({
    fileName: file.name,
    preview: resumeText.slice(0, 280),
    checklist,
    ai,
  });
}
