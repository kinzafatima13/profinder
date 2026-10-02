export type TaxonomyCategory = {
  parent: string;
  name: string;
  description: string;
  keywords: string[];
};

export const TAXONOMY: TaxonomyCategory[] = [
  // ── Artificial Intelligence ──────────────────────────────────────────
  {
    parent: "Artificial Intelligence",
    name: "Artificial Intelligence",
    description: "General artificial intelligence, cognitive systems, and intelligent agents",
    keywords: ["artificial intelligence", "ai", "intelligent systems", "expert systems", "knowledge representation", "computational intelligence"],
  },
  {
    parent: "Artificial Intelligence",
    name: "Machine Learning",
    description: "Algorithms that learn patterns from data",
    keywords: ["machine learning", "supervised learning", "unsupervised learning", "reinforcement learning", "semi supervised", "representation learning", "transfer learning", "federated learning", "meta learning", "continual learning"],
  },
  {
    parent: "Artificial Intelligence",
    name: "Deep Learning",
    description: "Multi-layered neural network architectures and representation learning",
    keywords: ["deep learning", "neural network", "deep neural network", "transformer", "attention mechanism", "cnn", "convolutional neural", "rnn", "recurrent neural", "lstm", "gnn", "graph neural network", "diffusion model"],
  },
  {
    parent: "Artificial Intelligence",
    name: "Natural Language Processing",
    description: "Computational linguistics, text mining, and natural language understanding",
    keywords: ["natural language processing", "nlp", "llm", "large language model", "speech recognition", "machine translation", "information retrieval", "question answering", "sentiment analysis", "text generation", "computational linguistics"],
  },
  {
    parent: "Artificial Intelligence",
    name: "Computer Vision",
    description: "Visual data analysis, image processing, and 3D perception",
    keywords: ["computer vision", "image processing", "object detection", "semantic segmentation", "image recognition", "pattern recognition", "3d reconstruction", "video analysis", "face recognition", "point cloud", "generative visual"],
  },
  {
    parent: "Artificial Intelligence",
    name: "Generative AI",
    description: "Deep generative models, foundation models, and synthetic content generation",
    keywords: ["generative ai", "foundation models", "diffusion models", "gan", "generative adversarial network", "vae", "variational autoencoder", "text to image", "multimodal generative", "prompt engineering", "ai alignment"],
  },
  {
    parent: "Artificial Intelligence",
    name: "Robotics",
    description: "Autonomous robots, robotic perception, kinematics, and control",
    keywords: ["robotics", "autonomous systems", "motion planning", "slam", "robotic manipulation", "humanoid", "unmanned aerial vehicle", "uav", "mobile robots", "robot learning", "control systems"],
  },

  // ── Cybersecurity ──────────────────────────────────────────────────
  {
    parent: "Cybersecurity",
    name: "Cybersecurity",
    description: "Protection of systems, networks, programs, and data from digital attacks",
    keywords: ["cybersecurity", "information security", "cyber defense", "security", "threat intelligence", "malware analysis", "vulnerability assessment"],
  },
  {
    parent: "Cybersecurity",
    name: "Network Security",
    description: "Securing computer networks and telecommunications against unauthorized access",
    keywords: ["network security", "intrusion detection", "ids", "ips", "firewall", "ddos", "vpn", "protocol security", "dns security", "sdn security", "wireless security"],
  },
  {
    parent: "Cybersecurity",
    name: "Cloud Security",
    description: "Security architecture, access control, and isolation for cloud and virtualized infrastructure",
    keywords: ["cloud security", "virtualization security", "container security", "serverless security", "access control", "multi tenancy", "zero trust", "confidential computing"],
  },
  {
    parent: "Cybersecurity",
    name: "Cryptography",
    description: "Mathematical techniques for secure data encryption, signatures, and authentication",
    keywords: ["cryptography", "encryption", "public key", "post quantum cryptography", "homomorphic encryption", "zero knowledge", "zero knowledge proof", "zkp", "cryptographic protocols", "elliptic curve"],
  },
  {
    parent: "Cybersecurity",
    name: "Privacy",
    description: "Data privacy, differential privacy, privacy-preserving computation, and anonymity",
    keywords: ["privacy", "data privacy", "differential privacy", "anonymity", "privacy preserving", "gdpr", "secure multi party computation", "smpc", "de identification"],
  },
  {
    parent: "Cybersecurity",
    name: "Digital Forensics",
    description: "Investigation, recovery, and analysis of material found in digital devices",
    keywords: ["digital forensics", "computer forensics", "incident response", "memory forensics", "reverse engineering", "binary analysis", "exploit analysis"],
  },
  {
    parent: "Cybersecurity",
    name: "AI Security",
    description: "Security of AI systems, adversarial attacks, and trustworthy machine learning",
    keywords: ["ai security", "adversarial machine learning", "adversarial attack", "model robustness", "model extraction", "data poisoning", "backdoor attack", "trustworthy ai", "safe ai"],
  },
  {
    parent: "Cybersecurity",
    name: "Blockchain Security",
    description: "Security, consensus mechanisms, and smart contract analysis in distributed ledgers",
    keywords: ["blockchain security", "smart contract security", "distributed ledger security", "consensus protocol", "defi security", "cryptocurrency security"],
  },

  // ── Computer Science ───────────────────────────────────────────────
  {
    parent: "Computer Science",
    name: "Computer Science",
    description: "Core computational foundations, computer architecture, and theory",
    keywords: ["computer science", "computational theory", "computer systems", "theoretical computer science", "computer architecture", "high performance computing"],
  },
  {
    parent: "Computer Science",
    name: "Software Engineering",
    description: "Systematic design, development, testing, maintenance, and verification of software",
    keywords: ["software engineering", "software architecture", "program analysis", "software testing", "code generation", "devops", "software quality", "formal verification", "debugging", "continuous integration"],
  },
  {
    parent: "Computer Science",
    name: "Computer Networks",
    description: "Design, protocols, and performance of packet-switched communication networks",
    keywords: ["computer networks", "networking", "routing", "tcp ip", "sdn", "software defined networking", "wireless networks", "5g", "6g", "iot", "internet of things", "sensor networks"],
  },
  {
    parent: "Computer Science",
    name: "Distributed Systems",
    description: "Coordinated networked computing systems, consensus, and fault tolerance",
    keywords: ["distributed systems", "distributed computing", "consensus", "paxos", "raft", "fault tolerance", "edge computing", "cloud computing", "cluster computing", "scalability", "microservices"],
  },
  {
    parent: "Computer Science",
    name: "Databases",
    description: "Data models, database engines, query optimization, and storage management",
    keywords: ["databases", "database systems", "data management", "sql", "nosql", "query optimization", "graph database", "transaction processing", "key value store", "big data systems", "data warehouse"],
  },
  {
    parent: "Computer Science",
    name: "Operating Systems",
    description: "Kernel architecture, memory management, concurrency, virtualization, and file systems",
    keywords: ["operating systems", "kernel", "linux kernel", "virtualization", "file systems", "concurrency", "memory management", "scheduling", "hypervisor", "real time systems"],
  },
  {
    parent: "Computer Science",
    name: "Algorithms",
    description: "Algorithm design, complexity theory, data structures, and computational optimization",
    keywords: ["algorithms", "algorithm design", "computational complexity", "data structures", "graph algorithms", "combinatorial optimization", "approximation algorithms", "randomized algorithms"],
  },
  {
    parent: "Computer Science",
    name: "Human-Computer Interaction",
    description: "Interaction design, user interfaces, augmented/virtual reality, and usability",
    keywords: ["human computer interaction", "hci", "user interface", "user experience", "ux", "virtual reality", "augmented reality", "vr", "ar", "interactive systems", "accessible computing", "computer supported cooperative work"],
  },
];

/**
 * Categorizes a professor into multiple research areas based on text evidence
 * (interests, keywords, topics, department, publications, etc.).
 * A professor can belong to MULTIPLE research areas.
 */
export function matchResearchAreas(evidenceText: string): string[] {
  if (!evidenceText) return [];
  const normalized = evidenceText.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const matched = new Set<string>();

  for (const cat of TAXONOMY) {
    const areaNameLower = cat.name.toLowerCase();
    // Direct name match (as whole word or phrase)
    const nameRegex = new RegExp(`\\b${areaNameLower.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (nameRegex.test(normalized)) {
      matched.add(cat.name);
      continue;
    }

    // Check keywords
    for (const kw of cat.keywords) {
      const kwRegex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      if (kwRegex.test(normalized)) {
        matched.add(cat.name);
        break;
      }
    }
  }

  return Array.from(matched);
}
