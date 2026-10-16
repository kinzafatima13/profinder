/**
 * Anhui University (AHU) official faculty discovery — READ-ONLY.
 *
 * This script crawls only official AHU websites, discovers department/faculty
 * pages, and writes a CSV review file. It does not connect to Prisma/Neon and never
 * changes the database. Extraction is heuristic: review the CSV before importing.
 *
 * Run:
 *   npx tsx scripts/collect-ahu-faculty.ts
 *   npx tsx scripts/collect-ahu-faculty.ts --max-pages=250 --out=data/ahu-faculty-candidates.csv
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const START_URL = "https://www.ahu.edu.cn/_t992/183/list.htm";
function isOfficialAhuHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\\.$/, "");
  return host === "ahu.edu.cn" || host.endsWith(".ahu.edu.cn");
}
const DEFAULT_MAX_PAGES = 150;
const REQUEST_DELAY_MS = 1000;

type PageRecord = {
  pageUrl: string;
  pageTitle: string;
  pageType: "directory" | "faculty_candidate" | "other";
  linkedName: string;
  linkedProfileUrl: string;
  email: string;
  departmentHint: string;
  researchHint: string;
  publicationLinks: string;
  verificationStatus: "OFFICIAL_SOURCE_NEEDS_REVIEW";
};

function arg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value: string): string {
  return decodeEntities(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href: string, base: string): string | null {
  const raw = decodeEntities(href).trim();
  if (!raw || /^(?:#|javascript:|mailto:|tel:|data:)/i.test(raw)) return null;
  try {
    const url = new URL(raw, base);
    if (!isOfficialAhuHost(url.hostname) || url.protocol !== "https:") return null;
    url.hash = "";
    if (!/\.(?:htm|html|shtml|jsp|php)$/i.test(url.pathname) && !url.pathname.endsWith("/")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function titleOf(html: string): string {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) : "";
}

function extractAnchors(html: string, pageUrl: string): Array<{ label: string; url: string }> {
  const anchors: Array<{ label: string; url: string }> = [];
  const re = /<a\b([^>]*?)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const href = match[2] ?? match[3] ?? match[4] ?? "";
    const url = absoluteUrl(href, pageUrl);
    const label = cleanText(match[6] ?? "");
    if (url && label && label.length <= 180) anchors.push({ label, url });
  }
  return anchors;
}

const NAVIGATION_LABEL = /^(首页|网站首页|学校概况|学校简介|学校标识|现任领导|历史沿革|大事记|基本信息|校园风光|机构设置|访问旧版|返回旧版|旧版入口|党政管理部门|直属单位|校办产业|教学与科研单位|新闻|通知公告|联系我们|English|Home|About|网站地图|搜索)$/i;
const INSTITUTION_LABEL = /学院|学部|教学部|研究院|研究中心|科研中心|实验室|中心|Institute|School|College|Faculty|Department/i;

function isDirectoryLike(text: string, url: string): boolean {
  return /school|department|faculty|staff|teacher|professor|people|team|research|college|师资|教师|学院|系所|学部|研究院|研究中心|实验室|教学部/i.test(
    text + " " + url,
  );
}

function isProfileLike(text: string, url: string): boolean {
  const path = new URL(url).pathname;
  if (!text || NAVIGATION_LABEL.test(text.trim()) || INSTITUTION_LABEL.test(text)) return false;
  if (/faculty|teacher|professor|people|staff|person|profile|tutor|mentor|导师|教师|师资/i.test(text + " " + path)) return true;
  // Some official staff profiles use generic numeric .htm URLs; only keep short
  // labels that plausibly represent a person's name, not generic site navigation.
  return /\.htm(?:l)?$/i.test(path) && text.length >= 2 && text.length <= 20 &&
    !/首页|概况|简介|标识|领导|历史|大事记|信息|风光|机构|部门|单位|学院|学部|研究院|研究中心|实验室|中心|新闻|公告|招生|就业|学生|教师队伍|师资队伍|English|Home|About/i.test(text);
}

function extractEmails(html: string): string[] {
  const normalized = decodeEntities(html.replace(/&#64;|&commat;/gi, "@").replace(/\s*\[at\]\s*|\s*\(at\)\s*/gi, "@").replace(/\s*\[dot\]\s*|\s*\(dot\)\s*/gi, "."));
  return [...new Set((normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
    .map((email) => email.replace(/[.,;:]+$/, "").toLowerCase())
    .filter((email) => !/example\.(com|org)|wixpress|sentry/i.test(email)))];
}

function csvEscape(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}

async function main() {
  const maxPages = Math.max(1, Math.min(1000, Number(arg("max-pages", String(DEFAULT_MAX_PAGES))) || DEFAULT_MAX_PAGES));
  const outPath = resolve(process.cwd(), arg("out", "data/ahu-faculty-candidates.csv"));
  const startUrl = new URL(arg("start-url", START_URL));
  if (!isOfficialAhuHost(startUrl.hostname) || startUrl.protocol !== "https:") {
    throw new Error(`Refusing non-official AHU URL: ${startUrl.toString()}`);
  }

  const queue = [startUrl.toString()];
  const queued = new Set(queue);
  const visited = new Set<string>();
  const records: PageRecord[] = [];
  let requestFailures = 0;

  while (queue.length && visited.size < maxPages) {
    const pageUrl = queue.shift()!;
    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    try {
      const response = await fetch(pageUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8",
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        requestFailures++;
        console.warn(`[skip] HTTP ${response.status}: ${pageUrl}`);
        continue;
      }
      const finalUrl = new URL(response.url || pageUrl);
      if (!isOfficialAhuHost(finalUrl.hostname)) {
        requestFailures++;
        console.warn(`[skip] Redirected outside official AHU hosts: ${finalUrl.toString()}`);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) continue;
      const html = await response.text();
      const pageTitle = titleOf(html);
      const anchors = extractAnchors(html, pageUrl);
      const emails = extractEmails(html);
      const directory = isDirectoryLike(pageTitle, pageUrl) || anchors.some((a) => /school|department|faculty|teacher|professor|college|学院|教师/i.test(a.label));
      const publicationLinks = anchors.filter((a) => /doi\.org|scholar\.google|orcid\.org|openalex\.org|semanticscholar\.org|researchgate\.net/i.test(a.url)).map((a) => a.url);

      const profileAnchors = anchors.filter((a) => isProfileLike(a.label, a.url));
      if (profileAnchors.length) {
        for (const candidate of profileAnchors) {
          records.push({
            pageUrl,
            pageTitle,
            pageType: "directory",
            linkedName: candidate.label,
            linkedProfileUrl: candidate.url,
            email: "",
            departmentHint: pageTitle,
            researchHint: "",
            publicationLinks: "",
            verificationStatus: "OFFICIAL_SOURCE_NEEDS_REVIEW",
          });
        }
      } else if (emails.length || publicationLinks.length) {
        records.push({
          pageUrl,
          pageTitle,
          pageType: directory ? "directory" : "faculty_candidate",
          linkedName: "",
          linkedProfileUrl: pageUrl,
          email: emails.join("; "),
          departmentHint: directory ? pageTitle : "",
          researchHint: "",
          publicationLinks: publicationLinks.join("; "),
          verificationStatus: "OFFICIAL_SOURCE_NEEDS_REVIEW",
        });
      }

      for (const link of anchors) {
        if (!queued.has(link.url) && !visited.has(link.url) && isDirectoryLike(link.label, link.url)) {
          queued.add(link.url);
          queue.push(link.url);
        }
      }

      console.log(`[${visited.size}/${maxPages}] ${pageTitle || pageUrl} | links=${anchors.length} | emails=${emails.length}`);
    } catch (error) {
      requestFailures++;
      console.warn(`[skip] ${pageUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, REQUEST_DELAY_MS));
  }

  const header = ["pageUrl", "pageTitle", "pageType", "linkedName", "linkedProfileUrl", "email", "departmentHint", "researchHint", "publicationLinks", "verificationStatus"];
  const lines = [header, ...records.map((record) => header.map((key) => String(record[key as keyof PageRecord] ?? "")))]
    .map((row) => row.map(csvEscape).join(","));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, lines.join("\r\n") + "\r\n", "utf8");

  console.log(JSON.stringify({
    mode: "READ_ONLY_DRY_RUN",
    startUrl: startUrl.toString(),
    pagesVisited: visited.size,
    candidateRows: records.length,
    requestFailures,
    output: outPath,
    databaseWrites: 0,
    warning: "Heuristic candidates only. Review official profile pages and verify every field before import.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
