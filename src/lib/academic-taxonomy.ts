export type AcademicFieldDefinition = {
  name: string;
  aliases: string[];
};

export const ACADEMIC_FIELDS: AcademicFieldDefinition[] = [
  { name: "Computer Science & Information Technology", aliases: ["computer science", "computer science and technology", "cs", "information technology", "it", "software engineering", "artificial intelligence", "ai", "cybersecurity", "cyberspace security", "data science"] },
  { name: "Engineering", aliases: ["engineering", "mechanical engineering", "civil engineering", "electrical engineering", "chemical engineering", "materials science", "aerospace engineering", "environmental engineering", "industrial engineering", "transportation engineering", "nuclear engineering"] },
  { name: "Natural Sciences", aliases: ["science", "mathematics", "physics", "chemistry", "biology", "statistics", "astronomy", "ecology", "atmospheric science", "mechanics"] },
  { name: "Agricultural Sciences", aliases: ["agriculture", "agricultural science", "agronomy", "horticulture", "plant science", "animal science", "forestry", "fisheries", "food science"] },
  { name: "Medicine & Health Sciences", aliases: ["medicine", "clinical medicine", "public health", "nursing", "pharmacy", "dentistry", "traditional chinese medicine", "biomedical science", "biomedical engineering", "basic medicine"] },
  { name: "Business & Management", aliases: ["business", "business administration", "management", "finance", "accounting", "marketing", "economics", "logistics", "supply chain", "public administration", "management science"] },
  { name: "Law & Political Science", aliases: ["law", "juris", "political science", "political sciences", "international relations", "public policy", "national security", "international affairs"] },
  { name: "Social Sciences", aliases: ["sociology", "psychology", "education", "social work", "communication", "journalism"] },
  { name: "Humanities & Languages", aliases: ["philosophy", "history", "literature", "linguistics", "english", "chinese language", "foreign languages", "classics"] },
  { name: "Architecture & Planning", aliases: ["architecture", "urban planning", "urban and rural planning", "landscape architecture"] },
  { name: "Arts & Design", aliases: ["art", "arts", "design", "fine arts", "music", "painting", "sculpture", "visual communication", "fashion design"] },
  { name: "Sports & Physical Education", aliases: ["sports", "sport science", "physical education"] },
  { name: "Environmental & Earth Sciences", aliases: ["environmental science", "environmental science and engineering", "earth science", "hydraulic engineering", "water resources"] },
  { name: "Interdisciplinary Studies", aliases: ["interdisciplinary", "cross-disciplinary", "country and region studies", "global affairs"] },
];

export function normalizeAcademicName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function slugifyAcademic(value: string): string {
  return normalizeAcademicName(value).replace(/\s+/g, "-");
}

export function inferAcademicField(major: string): string {
  const n = normalizeAcademicName(major);
  const ordered = [
    "Medicine & Health Sciences","Agricultural Sciences","Architecture & Planning","Arts & Design",
    "Sports & Physical Education","Law & Political Science","Business & Management",
    "Environmental & Earth Sciences","Humanities & Languages","Social Sciences",
    "Natural Sciences","Engineering","Computer Science & Information Technology","Interdisciplinary Studies"
  ];
  for (const field of ordered) {
    const def = ACADEMIC_FIELDS.find((x) => x.name === field)!;
    if (def.aliases.some((a) => n.includes(normalizeAcademicName(a)))) return field;
  }
  return "Interdisciplinary Studies";
}

export function inferDiscipline(major: string, field: string): string {
  const n = normalizeAcademicName(major);
  if (n === "computer science and technology" || n === "computer science") return "Computer Science";
  if (n.includes("software engineering")) return "Software Engineering";
  if (n.includes("artificial intelligence")) return "Artificial Intelligence";
  if (n.includes("finance")) return "Finance";
  if (n.includes("business administration")) return "Business Administration";
  if (n.includes("economics")) return "Economics";
  if (n.includes("law") || n.includes("juris")) return "Law";
  if (n.includes("medicine")) return "Medicine";
  if (n.includes("public health")) return "Public Health";
  if (n.includes("chemistry")) return "Chemistry";
  if (n.includes("biology") || n.includes("biological")) return "Biological Sciences";
  if (n.includes("physics")) return "Physics";
  if (n.includes("mathematics")) return "Mathematics";
  if (n.includes("mechanical engineering")) return "Mechanical Engineering";
  if (n.includes("electrical engineering")) return "Electrical Engineering";
  if (n.includes("civil engineering")) return "Civil Engineering";
  if (n.includes("chemical engineering")) return "Chemical Engineering";
  if (n.includes("materials")) return "Materials Science and Engineering";
  if (n.includes("environment")) return "Environmental Science and Engineering";
  if (n.includes("architecture")) return "Architecture";
  if (n.includes("design") || n.includes("fine arts") || n === "art") return "Arts and Design";
  return field;
}
