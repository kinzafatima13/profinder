import { PrismaClient } from "@prisma/client";
import { TAXONOMY } from "../src/lib/taxonomy";

const prisma = new PrismaClient();

export async function seedTaxonomy() {
  console.log("Seeding Research Area Taxonomy...");
  const parents = ["Artificial Intelligence", "Cybersecurity", "Computer Science"];
  const parentIdMap = new Map<string, string>();

  // 1. First ensure top-level parent categories exist
  for (const parentName of parents) {
    const foundParentDef = TAXONOMY.find((t) => t.name === parentName);
    const keywords = foundParentDef ? foundParentDef.keywords.join(",") : "";
    const description = foundParentDef ? foundParentDef.description : `${parentName} Research`;

    const parentArea = await prisma.researchArea.upsert({
      where: { name: parentName },
      update: {
        description,
        keywords,
      },
      create: {
        name: parentName,
        description,
        keywords,
      },
    });
    parentIdMap.set(parentName, parentArea.id);
  }

  // 2. Upsert all subcategories and link parentId
  let count = 0;
  for (const item of TAXONOMY) {
    if (parents.includes(item.name)) continue; // already upserted parent
    const parentId = parentIdMap.get(item.parent) || null;

    await prisma.researchArea.upsert({
      where: { name: item.name },
      update: {
        description: item.description,
        keywords: item.keywords.join(","),
        parentId,
      },
      create: {
        name: item.name,
        description: item.description,
        keywords: item.keywords.join(","),
        parentId,
      },
    });
    count++;
  }

  console.log(`Taxonomy successfully seeded: ${parents.length} parent categories, ${count} subcategories.`);
}

if (require.main === module) {
  seedTaxonomy()
    .catch((e) => {
      console.error("Failed to seed taxonomy:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
