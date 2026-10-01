/**
 * PROFINDER Seed Data
 * Initial universities, programs, research areas, and professors
 * Focus: China — Computer Science & related tech fields
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding PROFINDER database...");

  // Clean existing data (order matters for FKs)
  await prisma.application.deleteMany();
  await prisma.savedProfessor.deleteMany();
  await prisma.student.deleteMany();
  await prisma.professorResearchArea.deleteMany();
  await prisma.scholarship.deleteMany();
  await prisma.program.deleteMany();
  await prisma.professor.deleteMany();
  await prisma.researchArea.deleteMany();
  await prisma.university.deleteMany();

  // ── Research Areas ──────────────────────────────────────────
  const areas = await Promise.all([
    prisma.researchArea.create({
      data: {
        name: "Cybersecurity",
        description: "Protection of computer systems, networks, and data",
        keywords: "security,network security,cryptography,privacy,forensics,AI security",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Network Security",
        description: "Securing computer networks and communications",
        keywords: "firewall,intrusion detection,VPN,protocol security",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "AI Security",
        description: "Security of AI systems and adversarial machine learning",
        keywords: "adversarial attacks,model robustness,AI safety,poisoning",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Privacy",
        description: "Data privacy, differential privacy, and anonymity",
        keywords: "differential privacy,anonymization,GDPR,data protection",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Machine Learning",
        description: "Algorithms that learn from data",
        keywords: "supervised learning,unsupervised,reinforcement,deep learning",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Deep Learning",
        description: "Neural networks and representation learning",
        keywords: "CNN,RNN,Transformer,neural network",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Computer Vision",
        description: "Understanding images and video",
        keywords: "image recognition,object detection,segmentation,OCR",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Natural Language Processing",
        description: "Understanding and generating human language",
        keywords: "NLP,LLM,text mining,machine translation,chatbot",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Software Engineering",
        description: "Design, development, and maintenance of software systems",
        keywords: "software architecture,testing,DevOps,code quality",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Data Science",
        description: "Extracting knowledge and insights from data",
        keywords: "big data,analytics,data mining,visualization",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Cloud Security",
        description: "Security for cloud computing environments",
        keywords: "cloud,SaaS,IaaS,container security,zero trust",
      },
    }),
    prisma.researchArea.create({
      data: {
        name: "Cryptography",
        description: "Secure communication and cryptographic protocols",
        keywords: "encryption,blockchain,zero-knowledge,post-quantum",
      },
    }),
  ]);

  const areaMap = Object.fromEntries(areas.map((a) => [a.name, a.id]));

  // ── Universities ────────────────────────────────────────────
  const uestc = await prisma.university.create({
    data: {
      name: "University of Electronic Science and Technology of China",
      nameZh: "电子科技大学",
      country: "China",
      province: "Sichuan",
      city: "Chengdu",
      officialUrl: "https://en.uestc.edu.cn/",
      description:
        "UESTC is a national key university specializing in electronic science and technology. It is known for strong programs in computer science, cybersecurity, and information technology.",
      agencyNumber: "10614",
      verifiedAt: new Date(),
    },
  });

  const xidian = await prisma.university.create({
    data: {
      name: "Xidian University",
      nameZh: "西安电子科技大学",
      country: "China",
      province: "Shaanxi",
      city: "Xi'an",
      officialUrl: "https://en.xidian.edu.cn/",
      description:
        "Xidian University is a national key university focused on electronics and information technology, with particular strength in cybersecurity, communications, and computer science.",
      agencyNumber: "10701",
      verifiedAt: new Date(),
    },
  });

  const hit = await prisma.university.create({
    data: {
      name: "Harbin Institute of Technology",
      nameZh: "哈尔滨工业大学",
      country: "China",
      province: "Heilongjiang",
      city: "Harbin",
      officialUrl: "https://en.hit.edu.cn/",
      description:
        "HIT is a member of the C9 League and is renowned for engineering, computer science, and aerospace. Strong research in AI, cybersecurity, and software engineering.",
      agencyNumber: "10213",
      verifiedAt: new Date(),
    },
  });

  const bupt = await prisma.university.create({
    data: {
      name: "Beijing University of Posts and Telecommunications",
      nameZh: "北京邮电大学",
      country: "China",
      province: "Beijing",
      city: "Beijing",
      officialUrl: "https://english.bupt.edu.cn/",
      description:
        "BUPT is a key national university specializing in information technology, telecommunications, and computer science. Strong in cybersecurity and network engineering.",
      agencyNumber: "10013",
      verifiedAt: new Date(),
    },
  });

  const zjuedu = await prisma.university.create({
    data: {
      name: "Zhejiang University",
      nameZh: "浙江大学",
      country: "China",
      province: "Zhejiang",
      city: "Hangzhou",
      officialUrl: "https://www.zju.edu.cn/english/",
      description:
        "ZJU is one of China's top comprehensive research universities. Excellent computer science, AI, and data science programs with strong international collaboration.",
      agencyNumber: "10335",
      verifiedAt: new Date(),
    },
  });

  const ntu = await prisma.university.create({
    data: {
      name: "Nanjing University of Science and Technology",
      nameZh: "南京理工大学",
      country: "China",
      province: "Jiangsu",
      city: "Nanjing",
      officialUrl: "https://en.njust.edu.cn/",
      description:
        "NJUST is a national key university with strengths in computer science, cybersecurity, and information engineering.",
      agencyNumber: "10288",
      verifiedAt: new Date(),
    },
  });

  // ── Programs ────────────────────────────────────────────────
  const programData = [
    { uni: uestc, degree: "Master", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: uestc, degree: "Master", major: "Cybersecurity", teachingLang: "English" },
    { uni: uestc, degree: "PhD", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: uestc, degree: "PhD", major: "Cybersecurity", teachingLang: "English" },
    { uni: xidian, degree: "Master", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: xidian, degree: "Master", major: "Cybersecurity", teachingLang: "English" },
    { uni: xidian, degree: "PhD", major: "Information and Communication Engineering", teachingLang: "English" },
    { uni: hit, degree: "Master", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: hit, degree: "Master", major: "Software Engineering", teachingLang: "English" },
    { uni: hit, degree: "PhD", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: bupt, degree: "Master", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: bupt, degree: "Master", major: "Cybersecurity", teachingLang: "English" },
    { uni: bupt, degree: "PhD", major: "Information and Communication Engineering", teachingLang: "English" },
    { uni: zjuedu, degree: "Master", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: zjuedu, degree: "Master", major: "Artificial Intelligence", teachingLang: "English" },
    { uni: zjuedu, degree: "PhD", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: ntu, degree: "Master", major: "Computer Science and Technology", teachingLang: "English" },
    { uni: ntu, degree: "Master", major: "Cybersecurity", teachingLang: "English" },
  ];

  for (const p of programData) {
    await prisma.program.create({
      data: {
        universityId: p.uni.id,
        degree: p.degree,
        major: p.major,
        teachingLang: p.teachingLang,
        requirements: "Bachelor's degree in related field; English proficiency (IELTS 6.0+ / TOEFL 80+); recommendation letters.",
        deadline: "March 31 (typical CSC / university scholarship deadline)",
      },
    });
  }

  // ── Scholarships ────────────────────────────────────────────
  for (const uni of [uestc, xidian, hit, bupt, zjuedu, ntu]) {
    await prisma.scholarship.create({
      data: {
        universityId: uni.id,
        name: "Chinese Government Scholarship (CSC)",
        type: "CSC",
        requirements: "Check the official CSC notice for the current year. Typical materials include transcripts, study plan, and recommendations.",
        deadline: "Check campus china / embassy notice (often Feb–Apr; not a confirmed date)",
        officialUrl: "https://www.campuschina.org/",
        advantages: "Tuition waiver and monthly stipend when awarded. Confirm coverage on the official notice.",
        coverage: "CSC",
        dataStatus: "unverified",
      },
    });
    await prisma.scholarship.create({
      data: {
        universityId: uni.id,
        name: "University Scholarship",
        type: "University",
        requirements: "University-specific. Confirm on the official admissions page.",
        deadline: "Not confirmed — check the university admissions site",
        officialUrl: uni.officialUrl,
        advantages: "Partial or full tuition support, depending on the university award.",
        coverage: "University",
        dataStatus: "unverified",
      },
    });
    await prisma.scholarship.create({
      data: {
        universityId: uni.id,
        name: "Presidential / Outstanding Student Scholarship",
        type: "Presidential",
        requirements: "Usually limited awards for strong academic records. Confirm with the university.",
        deadline: "Not confirmed — check the university admissions site",
        officialUrl: uni.officialUrl,
        advantages: "Higher stipend or full award where offered. Availability is not guaranteed.",
        coverage: "University",
        dataStatus: "unverified",
      },
    });
  }

  // ── Professors ──────────────────────────────────────────────
  type ProfSeed = {
    uni: typeof uestc;
    name: string;
    nameZh?: string;
    position: string;
    school: string;
    department: string;
    email: string;
    profileUrl?: string;
    researchInterests: string;
    areas: string[];
  };

  const professors: ProfSeed[] = [
    {
      uni: uestc,
      name: "Wei Zhang",
      nameZh: "张伟",
      position: "Professor",
      school: "School of Computer Science and Engineering",
      department: "Cybersecurity",
      email: "wei.zhang@uestc.edu.cn",
      profileUrl: "https://en.uestc.edu.cn/",
      researchInterests: "Network security, intrusion detection, AI-driven security analytics, adversarial machine learning",
      areas: ["Cybersecurity", "Network Security", "AI Security"],
    },
    {
      uni: uestc,
      name: "Li Ming",
      nameZh: "李明",
      position: "Associate Professor",
      school: "School of Computer Science and Engineering",
      department: "Artificial Intelligence",
      email: "li.ming@uestc.edu.cn",
      researchInterests: "Deep learning, computer vision, secure AI systems, model robustness",
      areas: ["Deep Learning", "Computer Vision", "AI Security"],
    },
    {
      uni: uestc,
      name: "Chen Hao",
      nameZh: "陈浩",
      position: "Professor",
      school: "School of Information and Software Engineering",
      department: "Software Engineering",
      email: "chen.hao@uestc.edu.cn",
      researchInterests: "Software security, secure software engineering, code analysis, vulnerability detection",
      areas: ["Software Engineering", "Cybersecurity"],
    },
    {
      uni: xidian,
      name: "Wang Fang",
      nameZh: "王芳",
      position: "Professor",
      school: "School of Cyber Engineering",
      department: "Cybersecurity",
      email: "wang.fang@xidian.edu.cn",
      researchInterests: "Cryptography, privacy-preserving computation, blockchain security, post-quantum cryptography",
      areas: ["Cryptography", "Privacy", "Cybersecurity"],
    },
    {
      uni: xidian,
      name: "Liu Yang",
      nameZh: "刘阳",
      position: "Associate Professor",
      school: "School of Computer Science and Technology",
      department: "Network Security",
      email: "liu.yang@xidian.edu.cn",
      researchInterests: "Network protocol security, IoT security, cloud security, zero-trust architecture",
      areas: ["Network Security", "Cloud Security", "Cybersecurity"],
    },
    {
      uni: xidian,
      name: "Zhao Jun",
      nameZh: "赵军",
      position: "Professor",
      school: "School of Artificial Intelligence",
      department: "Machine Learning",
      email: "zhao.jun@xidian.edu.cn",
      researchInterests: "Machine learning theory, adversarial robustness, federated learning, AI security",
      areas: ["Machine Learning", "AI Security", "Deep Learning"],
    },
    {
      uni: hit,
      name: "Sun Wei",
      nameZh: "孙伟",
      position: "Professor",
      school: "School of Computer Science and Technology",
      department: "Cybersecurity",
      email: "sun.wei@hit.edu.cn",
      researchInterests: "System security, malware analysis, binary analysis, AI for cybersecurity",
      areas: ["Cybersecurity", "AI Security", "Software Engineering"],
    },
    {
      uni: hit,
      name: "Zhou Lei",
      nameZh: "周磊",
      position: "Associate Professor",
      school: "School of Computer Science and Technology",
      department: "Artificial Intelligence",
      email: "zhou.lei@hit.edu.cn",
      researchInterests: "Natural language processing, large language models, trustworthy AI, NLP security",
      areas: ["Natural Language Processing", "Deep Learning", "AI Security"],
    },
    {
      uni: hit,
      name: "Huang Ying",
      nameZh: "黄颖",
      position: "Professor",
      school: "School of Software",
      department: "Data Science",
      email: "huang.ying@hit.edu.cn",
      researchInterests: "Big data analytics, privacy-preserving data mining, secure multiparty computation",
      areas: ["Data Science", "Privacy", "Machine Learning"],
    },
    {
      uni: bupt,
      name: "Gao Xin",
      nameZh: "高鑫",
      position: "Professor",
      school: "School of Cyberspace Security",
      department: "Network Security",
      email: "gao.xin@bupt.edu.cn",
      researchInterests: "5G/6G security, network intrusion detection, software-defined networking security",
      areas: ["Network Security", "Cybersecurity", "Cloud Security"],
    },
    {
      uni: bupt,
      name: "Tang Mei",
      nameZh: "唐梅",
      position: "Associate Professor",
      school: "School of Computer Science",
      department: "Artificial Intelligence",
      email: "tang.mei@bupt.edu.cn",
      researchInterests: "Computer vision, multimodal learning, adversarial examples, vision security",
      areas: ["Computer Vision", "Deep Learning", "AI Security"],
    },
    {
      uni: bupt,
      name: "Feng Rui",
      nameZh: "冯锐",
      position: "Professor",
      school: "School of Cyberspace Security",
      department: "Cryptography",
      email: "feng.rui@bupt.edu.cn",
      researchInterests: "Applied cryptography, blockchain, privacy-enhancing technologies, zero-knowledge proofs",
      areas: ["Cryptography", "Privacy", "Cybersecurity"],
    },
    {
      uni: zjuedu,
      name: "Xu Ping",
      nameZh: "徐平",
      position: "Professor",
      school: "College of Computer Science and Technology",
      department: "Artificial Intelligence",
      email: "xu.ping@zju.edu.cn",
      researchInterests: "Deep learning, generative AI, trustworthy machine learning, AI alignment",
      areas: ["Deep Learning", "Machine Learning", "AI Security"],
    },
    {
      uni: zjuedu,
      name: "Wu Jing",
      nameZh: "吴静",
      position: "Associate Professor",
      school: "College of Computer Science and Technology",
      department: "Cybersecurity",
      email: "wu.jing@zju.edu.cn",
      researchInterests: "System and software security, vulnerability discovery, program analysis",
      areas: ["Cybersecurity", "Software Engineering"],
    },
    {
      uni: zjuedu,
      name: "Lin Tao",
      nameZh: "林涛",
      position: "Professor",
      school: "College of Computer Science and Technology",
      department: "Data Science",
      email: "lin.tao@zju.edu.cn",
      researchInterests: "Data mining, graph neural networks, privacy-aware analytics, federated learning",
      areas: ["Data Science", "Machine Learning", "Privacy"],
    },
    {
      uni: ntu,
      name: "Ma Qiang",
      nameZh: "马强",
      position: "Professor",
      school: "School of Computer Science and Engineering",
      department: "Cybersecurity",
      email: "ma.qiang@njust.edu.cn",
      researchInterests: "Network security, industrial control system security, cyber-physical systems",
      areas: ["Network Security", "Cybersecurity", "Cloud Security"],
    },
    {
      uni: ntu,
      name: "Shen Yu",
      nameZh: "沈宇",
      position: "Associate Professor",
      school: "School of Computer Science and Engineering",
      department: "Artificial Intelligence",
      email: "shen.yu@njust.edu.cn",
      researchInterests: "Machine learning security, adversarial attacks and defenses, robust AI",
      areas: ["Machine Learning", "AI Security", "Deep Learning"],
    },
  ];

  for (const p of professors) {
    const prof = await prisma.professor.create({
      data: {
        universityId: p.uni.id,
        name: p.name,
        nameZh: p.nameZh,
        position: p.position,
        school: p.school,
        department: p.department,
        email: p.email,
        profileUrl: p.profileUrl ?? null,
        profileIsPersonal: false,
        dataStatus: "unverified",
        researchInterests: p.researchInterests,
        publications: "Recent publications available on the official university profile and Google Scholar.",
        verifiedAt: new Date(),
      },
    });

    for (const areaName of p.areas) {
      const areaId = areaMap[areaName];
      if (areaId) {
        await prisma.professorResearchArea.create({
          data: {
            professorId: prof.id,
            researchAreaId: areaId,
          },
        });
      }
    }
  }

  // Demo student (password: demo1234)
  const passwordHash = await bcrypt.hash("demo1234", 12);
  await prisma.student.create({
    data: {
      email: "demo@profinder.app",
      passwordHash,
      name: "Demo Student",
      degree: "Master",
      major: "Computer Science",
      academicBackground: "B.Sc. Software Engineering, GPA 3.6/4.0",
      researchInterests: "Cybersecurity, AI Security, Network Security",
      skills: "Python, Machine Learning, Network Security, Linux",
      projects: "Intrusion detection prototype; adversarial example research project",
      plan: "free",
    },
  });

  const uniCount = await prisma.university.count();
  const profCount = await prisma.professor.count();
  const areaCount = await prisma.researchArea.count();
  const progCount = await prisma.program.count();

  console.log(`✅ Seed complete:`);
  console.log(`   Universities: ${uniCount}`);
  console.log(`   Professors:   ${profCount}`);
  console.log(`   Research areas: ${areaCount}`);
  console.log(`   Programs:    ${progCount}`);
  await prisma.student.updateMany({ data: { plan: "free" } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
