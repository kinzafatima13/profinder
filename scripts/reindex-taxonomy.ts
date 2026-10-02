import { PrismaClient } from "@prisma/client";
import { matchResearchAreas } from "../src/lib/taxonomy";

const prisma = new PrismaClient();

async function main() {
  console.log("Categorizing professors into research areas using taxonomy...");
  const professors = await prisma.professor.findMany({
    include: {
      topics: { include: { topic: true } },
    },
  });

  const areas = await prisma.researchArea.findMany();
  const areaMap = new Map(areas.map((a) => [a.name, a.id]));

  let totalLinked = 0;
  let profsWithAreas = 0;

  for (const prof of professors) {
    const textEvidence = [
      prof.researchInterests,
      prof.researchKeywords,
      prof.department,
      prof.school,
      prof.lab,
      prof.topics.map((t) => t.topic.name).join(" "),
      prof.publications,
    ]
      .filter(Boolean)
      .join(" ");

    const matchedNames = matchResearchAreas(textEvidence);

    // If no direct specific sub-area matched, but school or dept contains "Computer Science" or "Information"
    if (matchedNames.length === 0) {
      matchedNames.push("Computer Science");
    }

    let linkedForProf = 0;
    for (const name of matchedNames) {
      const areaId = areaMap.get(name);
      if (areaId) {
        await prisma.professorResearchArea.upsert({
          where: {
            professorId_researchAreaId: {
              professorId: prof.id,
              researchAreaId: areaId,
            },
          },
          update: {},
          create: {
            professorId: prof.id,
            researchAreaId: areaId,
          },
        });
        linkedForProf++;
        totalLinked++;
      }
    }

    if (linkedForProf > 0) profsWithAreas++;
  }

  console.log(`Finished: ${profsWithAreas}/${professors.length} professors now have research areas assigned (${totalLinked} total linkages).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
