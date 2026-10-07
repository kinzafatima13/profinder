const STOP = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "what", "how", "can", "are", "into",
  "using", "use", "want", "study", "research", "about", "have", "has", "but", "not", "you", "who",
  "where", "which", "degree", "bachelor", "master", "interested", "interest", "would", "like",
]);

const BACKGROUND = new Set(["software", "engineering", "computer", "science", "graduate", "international", "china", "university", "student"]);

export function discoveryTokens(raw: string) {
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => (word === "ai" || word.length >= 3) && !STOP.has(word));
  return [...new Set(words)].slice(0, 4);
}

export function labelTerm(token: string) {
  return token === "ai" ? "Artificial Intelligence" : token;
}

export function focusTokens(raw: string) {
  const tokens = discoveryTokens(raw);
  const focused = tokens.filter((token) => !BACKGROUND.has(token));
  return focused.length ? focused : tokens;
}

export function professorTextMatch(term: string) {
  if (term === "ai") {
    return {
      OR: [
        { researchInterests: { contains: "artificial intelligence" } },
        { researchKeywords: { contains: "artificial intelligence" } },
        { publications: { contains: "artificial intelligence" } },
        { publications: { contains: " AI" } },
        { researchInterests: { contains: " AI" } },
        { researchKeywords: { contains: " AI" } },
        { topics: { some: { topic: { name: { contains: "Artificial Intelligence" } } } } },
        { researchAreas: { some: { researchArea: { name: { contains: "Artificial Intelligence" } } } } },
      ],
    };
  }
  return {
    OR: [
      { name: { contains: term } },
      { nameZh: { contains: term } },
      { researchInterests: { contains: term } },
      { researchKeywords: { contains: term } },
      { department: { contains: term } },
      { publications: { contains: term } },
      { university: { OR: [{ name: { contains: term } }, { nameZh: { contains: term } }, { city: { contains: term } }] } },
      { researchAreas: { some: { researchArea: { OR: [{ name: { contains: term } }, { keywords: { contains: term } }] } } } },
      { topics: { some: { topic: { name: { contains: term } } } } },
      { academicFields: { some: { academicField: { name: { contains: term } } } } },
      { disciplines: { some: { discipline: { name: { contains: term } } } } },
      { majors: { some: { major: { OR: [{ name: { contains: term } }, { officialName: { contains: term } }] } } } },
    ],
  };
}

export function professorQueryWhere(raw: string) {
  const phrase = raw.trim();
  const tokens = focusTokens(phrase);
  return {
    OR: [
      ...professorTextMatch(phrase).OR,
      ...(tokens.length >= 2 ? [{ AND: tokens.map((token) => professorTextMatch(token)) }] : []),
    ],
  };
}
