/**
 * Concept clusters used only to relate phrases that already appear in stored records.
 * A cluster never creates a professor, program, or publication. It only links
 * a student phrase to a different phrase that is actually on file.
 */
export type Concept = { id: string; label: string; terms: string[] };

export const CONCEPTS: Concept[] = [
  { id: "precision-ag", label: "precision agriculture", terms: ["precision agriculture", "uav", "drone", "drones", "crop disease", "plant disease", "plant pathology", "remote sensing", "hyperspectral", "crop monitoring", "agronomy", "smart farming"] },
  { id: "med-imaging", label: "medical image analysis", terms: ["medical image", "medical imaging", "image segmentation", "tumor detection", "computer vision", "healthcare", "deep learning", "radiology"] },
  { id: "ml", label: "machine learning", terms: ["machine learning", "deep learning", "artificial intelligence", "neural network", "ai"] },
  { id: "cv", label: "computer vision", terms: ["computer vision", "image recognition", "object detection", "visual recognition"] },
  { id: "security", label: "cybersecurity", terms: ["cybersecurity", "network security", "intrusion detection", "information security"] },
  { id: "data", label: "data science", terms: ["data science", "data mining", "big data", "analytics"] },
  { id: "energy", label: "renewable energy", terms: ["renewable energy", "solar", "photovoltaic", "wind energy", "energy storage"] },
  { id: "climate", label: "climate and environment", terms: ["climate", "climate change", "environmental science", "sustainability", "carbon"] },
  { id: "bio", label: "biology", terms: ["biology", "genomics", "molecular biology", "genetics"] },
  { id: "health", label: "public health", terms: ["public health", "epidemiology", "healthcare", "clinical"] },
  { id: "biz", label: "business and finance", terms: ["finance", "marketing", "management", "economics", "accounting"] },
  { id: "civil", label: "civil engineering", terms: ["civil engineering", "structural", "transportation engineering", "geotechnical"] },
  { id: "mech", label: "mechanical engineering", terms: ["mechanical engineering", "robotics", "manufacturing", "thermodynamics"] },
  { id: "chem", label: "chemistry", terms: ["chemistry", "chemical engineering", "catalysis", "materials"] },
  { id: "humanities", label: "humanities", terms: ["history", "literature", "philosophy", "linguistics"] },
];

export function conceptsFor(text: string): Concept[] {
  const hay = ` ${text.toLowerCase()} `;
  return CONCEPTS.filter((concept) => concept.terms.some((term) => hay.includes(term)));
}

export function sharedConcepts(studentText: string, recordText: string): Concept[] {
  const record = conceptsFor(recordText);
  const recordIds = new Set(record.map((item) => item.id));
  return conceptsFor(studentText).filter((item) => recordIds.has(item.id));
}
