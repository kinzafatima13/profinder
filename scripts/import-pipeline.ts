import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { ProFinderImporter } from "../src/lib/importer/pipeline";
import { UniversityInput, ProfessorInput } from "../src/lib/importer/types";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    limit?: number;
    university?: string;
    enrich?: boolean;
    file?: string;
    country?: string;
    profLimit?: number;
  } = {};

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--university=")) {
      options.university = arg.split("=")[1].replace(/^["']|["']$/g, "").trim();
    } else if (arg.startsWith("--enrich=")) {
      options.enrich = arg.split("=")[1].toLowerCase() === "true";
    } else if (arg.startsWith("--file=")) {
      options.file = arg.split("=")[1].trim();
    } else if (arg.startsWith("--country=")) {
      options.country = arg.split("=")[1].trim();
    } else if (arg.startsWith("--prof-limit=")) {
      options.profLimit = parseInt(arg.split("=")[1], 10);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  console.log("🚀 Starting PROFINDER Bulk Importer Pipeline...");
  console.log("Options:", {
    limit: options.limit ?? "all",
    universityFilter: options.university ?? "none",
    enrichWithAcademicApis: options.enrich ?? true,
    file: options.file ?? "data/universities.json",
    profLimitPerUni: options.profLimit ?? 10,
  });

  // 1. Load university data
  const uniFilePath = options.file
    ? path.resolve(process.cwd(), options.file)
    : path.join(process.cwd(), "data", "universities.json");

  let uniRows: UniversityInput[] = [];
  if (fs.existsSync(uniFilePath)) {
    uniRows = JSON.parse(fs.readFileSync(uniFilePath, "utf8"));
  } else {
    console.error(`❌ University data file not found: ${uniFilePath}`);
    process.exit(1);
  }

  // 2. Load professor base dataset
  const profFilePath = path.join(process.cwd(), "data", "professors.json");
  let profRows: (ProfessorInput & { university: string })[] = [];
  if (fs.existsSync(profFilePath)) {
    profRows = JSON.parse(fs.readFileSync(profFilePath, "utf8"));
  }

  // Group base professors by university name
  const profsByUni = new Map<string, ProfessorInput[]>();
  for (const p of profRows) {
    const key = (p.university || "").trim().toLowerCase();
    if (!profsByUni.has(key)) profsByUni.set(key, []);
    profsByUni.get(key)!.push(p);
  }

  // 3. Filter universities if requested
  let targets = uniRows;
  if (options.university) {
    const filterLower = options.university.toLowerCase();
    targets = targets.filter((u) => u.name.toLowerCase().includes(filterLower));
    if (targets.length === 0) {
      console.warn(`⚠️  No universities matched filter: "${options.university}". Creating on-the-fly target.`);
      targets = [{ name: options.university, country: options.country || "China" }];
    }
  }

  if (options.limit && options.limit > 0) {
    targets = targets.slice(0, options.limit);
  }

  console.log(`📋 Found ${targets.length} target universities to process.`);

  // 4. Instantiate and execute the importer
  const importer = new ProFinderImporter(prisma, {
    enrichWithAcademicApis: options.enrich ?? true,
    maxProfessorsPerUni: options.profLimit ?? 10,
    maxWorksPerProf: 5,
    defaultCountry: options.country || "China",
    onProgress: (msg) => console.log(msg),
  });

  for (const uni of targets) {
    const uniKey = uni.name.trim().toLowerCase();
    const baseProfs = profsByUni.get(uniKey) || [];
    await importer.processUniversity(uni, baseProfs);
  }

  // 5. Final Report
  importer.printReport();
}

main()
  .catch((err) => {
    console.error("Fatal error in import pipeline:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
