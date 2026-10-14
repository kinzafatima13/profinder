import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API = "https://api.openalex.org";
const MAX_LIMIT = 10000;

type Institution = {
id: string;
display_name: string;
country_code?: string | null;
homepage_url?: string | null;
};

type Author = {
id: string;
display_name: string;
orcid?: string | null;
works_count?: number;
topics?: Array<{ display_name?: string }>;
last_known_institutions?: Array<{
id?: string;
display_name?: string;
country_code?: string | null;
}> | null;
};

type Response<T> = {
results?: T[];
meta?: { next_cursor?: string | null };
};

function option(name: string, fallback: string): string {
const prefix = "--" + name + "=";
return process.argv.find((arg) => arg.startsWith(prefix))
?.slice(prefix.length) ?? fallback;
}

async function request<T>(
endpoint: string,
params: Record<string, string>,
): Promise<Response<T>> {
const url = new URL(API + "/" + endpoint);
for (const [key, value] of Object.entries(params)) {
url.searchParams.set(key, value);
}

const apiKey = process.env.OPENALEX_API_KEY?.trim();
if (apiKey) url.searchParams.set("api_key", apiKey);

const response = await fetch(url, {
headers: { "User-Agent": "ProFinderNow-AcademicCollector/2.0" },
signal: AbortSignal.timeout(30000),
});

if (!response.ok) {
throw new Error("OpenAlex HTTP " + response.status + ": " +
(await response.text()).slice(0, 500));
}
return await response.json() as Response<T>;
}

async function main(): Promise<void> {
const universityQuery = option("university", "").trim();
const limit = Number(option("limit", "500"));
const outputDir = resolve(
process.cwd(),
option("out", "data/academic-candidates-v2"),
);

if (!universityQuery) {
throw new Error('Provide --university="Exact University Name".');
}
if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
throw new Error("--limit must be an integer from 1 to " + MAX_LIMIT);
}

console.log("Searching for exact institution: " + universityQuery);

const institutionResponse = await request<Institution>("institutions", {
search: universityQuery,
"per-page": "25",
select: "id,display_name,country_code,homepage_url",
});

const matches = (institutionResponse.results ?? []).filter(
(item) =>
item.display_name.trim().toLocaleLowerCase() ===
universityQuery.toLocaleLowerCase(),
);

if (matches.length !== 1) {
throw new Error(
"Could not identify exactly one institution by exact name. " +
"Found " + matches.length + " exact matches. No files written.",
);
}

const institution = matches[0];

if (institution.country_code?.toUpperCase() !== "CN") {
throw new Error(
"The matched institution is not confirmed as being in China. No files written.",
);
}

console.log("Selected: " + institution.display_name);
console.log("OpenAlex ID: " + institution.id);
console.log("Requested candidate limit: " + limit);

const institutionId = institution.id.replace(
"https://openalex.org/", "",
);

const collected = new Map<string, Author>();
let cursor = "*";
let pages = 0;

while (collected.size < limit) {
const pageSize = Math.min(200, limit - collected.size);
const response = await request<Author>("authors", {
filter: "last_known_institutions.id:" + institutionId,
sort: "works_count:desc",
"per-page": String(pageSize),
cursor,
select:
"id,display_name,orcid,works_count,topics,last_known_institutions",
});

const authors = response.results ?? [];
if (authors.length === 0) break;

for (const author of authors) {
  if (!author.id || !author.display_name?.trim()) continue;

  const institutions = author.last_known_institutions;
  if (!Array.isArray(institutions)) {
    throw new Error(
      "OpenAlex did not return affiliation details. Stopping safely.",
    );
  }

  const affiliationMatches = institutions.some(
    (item) => item.id === institution.id,
  );
  if (!affiliationMatches) continue;

  collected.set(author.id, author);
  if (collected.size >= limit) break;
}

pages++;
console.log(
  "Pages requested: " + pages +
  "; affiliation-matched candidates: " + collected.size,
);

const nextCursor = response.meta?.next_cursor;
if (!nextCursor || nextCursor === cursor) break;
cursor = nextCursor;

}

const country = new Intl.DisplayNames(["en"], {
type: "region",
}).of("CN");

if (!country || country === "CN") {
throw new Error("Could not resolve country name. No files written.");
}

const universityRecord = {
name: institution.display_name,
country,
sourceUrl: institution.id,
...(institution.homepage_url
? { officialUrl: institution.homepage_url }
: {}),
openAlexId: institution.id,
dataSource: "OpenAlex",
dataStatus: "NEEDS_VERIFICATION",
programs: [],
scholarships: [],
};

const professorRecords = [...collected.values()].map((author) => ({
name: author.display_name.trim(),
university: institution.display_name,
sourceUrl: author.id,
profileUrl: author.id,
openAlexId: author.id,
orcid: author.orcid || null,
researchInterests: (author.topics ?? [])
.map((topic) => topic.display_name)
.filter((topic): topic is string => Boolean(topic))
.join(", "),
publications: author.works_count ?? 0,
country,
dataSource: "OpenAlex",
affiliationMatch: "OPENALEX_LAST_KNOWN_INSTITUTION_MATCH",
dataStatus: "NEEDS_VERIFICATION",
}));

await mkdir(outputDir, { recursive: true });

await writeFile(
resolve(outputDir, "universities.json"),
JSON.stringify([universityRecord], null, 2) + "\n",
"utf8",
);

await writeFile(
resolve(outputDir, "professors.json"),
JSON.stringify(professorRecords, null, 2) + "\n",
"utf8",
);

console.log("\nCollection complete.");
console.log("Researchers saved: " + professorRecords.length);
console.log("Pages requested: " + pages);
console.log("Output folder: " + outputDir);
console.log("Database writes: none.");
console.log("Official verification: still required.");
}

main().catch((error: unknown) => {
console.error(error instanceof Error ? error.message : error);
process.exitCode = 1;
});

