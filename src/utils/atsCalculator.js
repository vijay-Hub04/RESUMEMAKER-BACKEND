/**
 * Comprehensive Tech Skills Taxonomy for ATS Evaluation
 */
const TECH_SKILLS_DICTIONARY = [
  // Languages
  { name: 'JavaScript', aliases: ['javascript', 'js', 'es6', 'es2020'] },
  { name: 'TypeScript', aliases: ['typescript', 'ts'] },
  { name: 'Python', aliases: ['python', 'py'] },
  { name: 'Java', aliases: ['java', 'jdk', 'jvm'] },
  { name: 'C++', aliases: ['c++', 'cpp'] },
  { name: 'C#', aliases: ['c#', 'csharp', '.net'] },
  { name: 'Go', aliases: ['golang', 'go language'] },
  { name: 'Rust', aliases: ['rust'] },
  { name: 'PHP', aliases: ['php', 'laravel'] },
  { name: 'Ruby', aliases: ['ruby', 'rails'] },
  { name: 'SQL', aliases: ['sql', 't-sql', 'pl/sql'] },

  // Frontend
  { name: 'React', aliases: ['react', 'react.js', 'reactjs'] },
  { name: 'Next.js', aliases: ['next.js', 'nextjs'] },
  { name: 'Vue.js', aliases: ['vue', 'vue.js', 'vuejs'] },
  { name: 'Angular', aliases: ['angular', 'angularjs'] },
  { name: 'Redux', aliases: ['redux', 'redux toolkit', 'rtk'] },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss'] },
  { name: 'HTML5', aliases: ['html', 'html5'] },
  { name: 'CSS3', aliases: ['css', 'css3', 'sass', 'scss'] },
  { name: 'Framer Motion', aliases: ['framer motion', 'framer-motion'] },
  { name: 'Webpack', aliases: ['webpack', 'vite', 'esbuild'] },

  // Backend & APIs
  { name: 'Node.js', aliases: ['node', 'node.js', 'nodejs'] },
  { name: 'Express.js', aliases: ['express', 'express.js', 'expressjs'] },
  { name: 'NestJS', aliases: ['nestjs', 'nest.js'] },
  { name: 'FastAPI', aliases: ['fastapi', 'fast api'] },
  { name: 'Django', aliases: ['django'] },
  { name: 'Spring Boot', aliases: ['spring boot', 'spring-boot'] },
  { name: 'REST APIs', aliases: ['rest', 'rest api', 'restful', 'restful apis'] },
  { name: 'GraphQL', aliases: ['graphql', 'apollo'] },
  { name: 'WebSockets', aliases: ['websocket', 'websockets', 'socket.io'] },
  { name: 'Microservices', aliases: ['microservices', 'microservice architecture'] },

  // Databases
  { name: 'MongoDB', aliases: ['mongodb', 'mongo', 'mongoose'] },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { name: 'MySQL', aliases: ['mysql'] },
  { name: 'Redis', aliases: ['redis'] },
  { name: 'SQLite', aliases: ['sqlite'] },
  { name: 'Elasticsearch', aliases: ['elasticsearch', 'elk'] },
  { name: 'Firebase', aliases: ['firebase', 'firestore'] },
  { name: 'Supabase', aliases: ['supabase'] },

  // DevOps & Cloud
  { name: 'Docker', aliases: ['docker', 'containerization', 'docker compose'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'AWS', aliases: ['aws', 'amazon web services', 's3', 'ec2', 'lambda'] },
  { name: 'Azure', aliases: ['azure', 'microsoft azure'] },
  { name: 'GCP', aliases: ['gcp', 'google cloud'] },
  { name: 'CI/CD', aliases: ['ci/cd', 'ci cd', 'github actions', 'jenkins', 'gitlab ci'] },
  { name: 'Git', aliases: ['git', 'github', 'gitlab'] },
  { name: 'Terraform', aliases: ['terraform', 'iac'] },
  { name: 'Linux', aliases: ['linux', 'bash', 'shell scripting'] },

  // Testing & Quality
  { name: 'Jest', aliases: ['jest', 'vitest'] },
  { name: 'Cypress', aliases: ['cypress', 'playwright', 'selenium'] },
  { name: 'Unit Testing', aliases: ['unit test', 'unit testing', 'tdd'] },

  // Architecture & Methodologies
  { name: 'Agile', aliases: ['agile', 'scrum', 'kanban'] },
  { name: 'System Design', aliases: ['system design', 'scalability', 'high availability'] },
  { name: 'Performance Optimization', aliases: ['performance optimization', 'profiling', 'web vitals'] },
];

/**
 * Common Action Verbs
 */
const ACTION_VERBS = [
  'developed', 'built', 'designed', 'implemented', 'architected',
  'engineered', 'spearheaded', 'optimized', 'led', 'managed',
  'created', 'deployed', 'integrated', 'automated', 'scaled',
  'improved', 'accelerated', 'launched', 'delivered', 'reduced',
  'increased', 'coordinated', 'mentored', 'established', 'revamped'
];

/**
 * Standard Section Patterns
 */
const SECTION_PATTERNS = {
  experience: /\b(experience|work history|employment|career history|professional experience|work experience)\b/i,
  education: /\b(education|academic background|qualifications|degrees|university|college)\b/i,
  skills: /\b(skills|technical skills|technologies|competencies|tools|tech stack|proficiencies)\b/i,
  projects: /\b(projects|personal projects|key projects|selected projects)\b/i,
  summary: /\b(summary|professional summary|about me|profile|objective|career overview)\b/i,
  certifications: /\b(certifications|certificates|licenses|accreditations)\b/i,
};

/**
 * Analyze Resume Text and Calculate Real ATS Metrics
 * @param {string} text - Raw extracted resume text
 * @param {number} numPages - Extracted page count
 * @param {number} fileSize - File size in bytes
 * @returns {Object} Complete ATS result matching frontend ATSResults format
 */
function calculateATSScore(text, numPages = 1, fileSize = 0) {
  const normalizedText = (text || '').toLowerCase();
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Contact Information Detection
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})|\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/);
  const linkedinMatch = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i.test(text);
  const githubMatch = /github\.com\/[a-zA-Z0-9_-]+/i.test(text);

  const hasEmail = Boolean(emailMatch);
  const hasPhone = Boolean(phoneMatch);
  const hasLinks = linkedinMatch || githubMatch;

  // 2. Section Headers Detection
  const sectionsFound = {
    experience: SECTION_PATTERNS.experience.test(text),
    education: SECTION_PATTERNS.education.test(text),
    skills: SECTION_PATTERNS.skills.test(text),
    projects: SECTION_PATTERNS.projects.test(text),
    summary: SECTION_PATTERNS.summary.test(text),
    certifications: SECTION_PATTERNS.certifications.test(text),
  };

  // 3. Technical Skills Detection
  const foundSkills = [];
  const missingCandidates = [];

  TECH_SKILLS_DICTIONARY.forEach((skill) => {
    const isMatched = skill.aliases.some((alias) => {
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z0-9]|$)`, 'i');
      return regex.test(text);
    });

    if (isMatched) {
      foundSkills.push(skill.name);
    } else {
      missingCandidates.push(skill.name);
    }
  });

  // Pick top 7 missing skills that complement what was found
  const suggestedMissing = missingCandidates
    .filter((s) => ['TypeScript', 'Docker', 'AWS', 'CI/CD', 'Jest', 'GraphQL', 'Kubernetes', 'PostgreSQL', 'Redis', 'Tailwind CSS'].includes(s))
    .slice(0, 6);

  // 4. Action Verbs & Measurable Metrics Detection
  const foundActionVerbs = ACTION_VERBS.filter((verb) => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    return regex.test(text);
  });

  // Detect metrics (e.g. 30%, $50K, 2x, 100k users, improved by 25%)
  const metricsMatches = text.match(/\b\d+(\.\d+)?\s*%|\$\s*\d+[\.,]?\d*[kKmMbB]?|\b\d+x\b|\b\d+\s*\+?\s*(users|clients|customers|requests|transactions|downloads|stars|views|queries|nodes)/gi) || [];
  const uniqueMetricsCount = metricsMatches.length;

  // ==========================================
  // SCORING PILLARS (0 - 100 Total)
  // ==========================================

  // Pillar 1: Section Structure (25 Points)
  let structurePoints = 0;
  if (sectionsFound.experience) structurePoints += 7;
  if (sectionsFound.skills) structurePoints += 6;
  if (sectionsFound.education) structurePoints += 5;
  if (hasEmail) structurePoints += 3;
  if (hasPhone) structurePoints += 2;
  if (sectionsFound.summary || sectionsFound.projects) structurePoints += 2;

  // Pillar 2: Technical Skill Density (30 Points)
  let skillsPoints = 0;
  const skillsCount = foundSkills.length;
  if (skillsCount >= 10) skillsPoints = 30;
  else if (skillsCount >= 7) skillsPoints = 25;
  else if (skillsCount >= 5) skillsPoints = 20;
  else if (skillsCount >= 3) skillsPoints = 14;
  else if (skillsCount >= 1) skillsPoints = 8;
  else skillsPoints = 2;

  // Pillar 3: Content Quality & Metrics (25 Points)
  let contentPoints = 0;
  // Word count check (300-1100 optimal)
  if (wordCount >= 350 && wordCount <= 1100) contentPoints += 8;
  else if (wordCount >= 200 && wordCount <= 1400) contentPoints += 5;
  else contentPoints += 2;

  // Action verbs
  if (foundActionVerbs.length >= 5) contentPoints += 9;
  else if (foundActionVerbs.length >= 3) contentPoints += 6;
  else if (foundActionVerbs.length >= 1) contentPoints += 3;

  // Metrics
  if (uniqueMetricsCount >= 3) contentPoints += 8;
  else if (uniqueMetricsCount >= 1) contentPoints += 4;

  // Pillar 4: Formatting & Layout Compatibility (20 Points)
  let formattingPoints = 0;
  // Machine text readability
  if (text.length > 250) formattingPoints += 10;
  else formattingPoints += 3;

  // Page length
  if (numPages >= 1 && numPages <= 2) formattingPoints += 6;
  else if (numPages === 3) formattingPoints += 3;
  else formattingPoints += 1;

  // File size check (< 5MB is optimal)
  if (fileSize < 5 * 1024 * 1024) formattingPoints += 4;
  else formattingPoints += 2;

  // Total Score (Clamped between 20 and 96 for realism)
  const rawScore = structurePoints + skillsPoints + contentPoints + formattingPoints;
  const score = Math.min(96, Math.max(22, rawScore));

  // Determine Status Tier
  let status = 'Good Compatibility';
  if (score >= 85) status = 'Exceptional Match';
  else if (score >= 74) status = 'Good Compatibility';
  else if (score >= 60) status = 'Average Compatibility';
  else status = 'Needs Improvement';

  // Formatting Checklist Items
  const formattingScore = Math.min(100, Math.round((formattingPoints / 20) * 100));
  const formattingStatus = formattingScore >= 80 ? 'Optimal' : formattingScore >= 60 ? 'Acceptable' : 'Requires Review';

  const formattingItems = [
    {
      name: 'Standard Section Headings',
      passed: sectionsFound.experience && sectionsFound.skills && sectionsFound.education,
      note: sectionsFound.experience && sectionsFound.skills
        ? 'Standard headings (Experience, Skills, Education) clearly recognized.'
        : 'Missing one or more standard section headers (Experience, Skills, Education).',
    },
    {
      name: 'Contact Information Parsing',
      passed: hasEmail && hasPhone,
      note: hasEmail && hasPhone
        ? 'Direct email and phone number parsed from header.'
        : !hasEmail
        ? 'No valid email address found in the document.'
        : 'Phone number could not be extracted cleanly.',
    },
    {
      name: 'ATS Single-Column Flow',
      passed: text.length > 300,
      note: text.length > 300
        ? 'Text flow extracted chronologically without multi-column corruption.'
        : 'Text appears sparse or layout may have complex tabular nested columns.',
    },
    {
      name: 'Optimal Page Length',
      passed: numPages <= 2,
      note: `Detected ${numPages} page${numPages > 1 ? 's' : ''}. (1–2 pages is standard recruiter preference).`,
    },
    {
      name: 'Portfolio / Profile Links',
      passed: hasLinks,
      note: hasLinks
        ? 'Detected professional profile links (LinkedIn / GitHub).'
        : 'No LinkedIn or GitHub profile URLs recognized in contact section.',
    },
  ];

  // Strengths
  const strengths = [];
  if (sectionsFound.experience && sectionsFound.skills) {
    strengths.push('Clear chronological structure with recognizable section hierarchy.');
  }
  if (foundSkills.length >= 6) {
    strengths.push(`Strong technical skill depth (${foundSkills.length} keywords identified across stack).`);
  }
  if (foundActionVerbs.length >= 4) {
    strengths.push('Effective use of action verbs in experience statements.');
  }
  if (uniqueMetricsCount >= 2) {
    strengths.push('Inclusion of quantifiable business impacts and measurable results.');
  }
  if (hasLinks) {
    strengths.push('Professional portfolio and social proof links (GitHub/LinkedIn) detected.');
  }
  if (strengths.length === 0) {
    strengths.push('Clean plain-text parsing with recognized contact data.');
  }

  // Weaknesses
  const weaknesses = [];
  if (uniqueMetricsCount < 2) {
    weaknesses.push('Few quantified business outcomes (e.g. percentages, revenue, latency reductions).');
  }
  if (foundSkills.length < 6) {
    weaknesses.push('Limited tech keyword density for modern automated filters.');
  }
  if (!sectionsFound.summary) {
    weaknesses.push('Missing a dedicated Professional Summary highlighting your career niche.');
  }
  if (numPages > 2) {
    weaknesses.push(`Document length (${numPages} pages) exceeds the recommended 2-page ceiling.`);
  }
  if (!hasLinks) {
    weaknesses.push('No clickable LinkedIn or GitHub profiles found in the header.');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Minor keyword expansion could further elevate senior matching rates.');
  }

  // Recommendations
  const recommendations = [
    {
      category: 'Impact Metrics',
      tip: uniqueMetricsCount >= 2
        ? 'Continue highlighting quantifiable metrics across your most recent employment entries.'
        : 'Incorporate at least 2 to 3 measurable results (e.g., "boosted speed by 25%", "supported 10K+ users").',
    },
    {
      category: 'Keyword Optimization',
      tip: suggestedMissing.length > 0
        ? `Consider adding relevant keywords such as ${suggestedMissing.slice(0, 3).join(', ')} to your skills section.`
        : 'Keep your technical skills section categorized into Languages, Frameworks, and Cloud tools.',
    },
    {
      category: 'Summary Statement',
      tip: sectionsFound.summary
        ? 'Refine your summary to clearly state your primary tech stack and years of core experience.'
        : 'Add a 3-4 sentence Professional Summary at the top of your resume before your experience.',
    },
  ];

  // Compose dynamic summary
  const summary = `Your resume scored ${score}/100 (${status}). ${
    sectionsFound.skills ? `We identified ${foundSkills.length} technical skills across your profile.` : 'We recommend expanding your dedicated skills section.'
  } ${
    uniqueMetricsCount >= 2
      ? 'Your bullet points include good measurable business results.'
      : 'Adding more quantifiable metrics and bullet point action verbs will help push your score into the 90+ tier.'
  }`;

  return {
    score,
    status,
    summary,
    formatting: {
      score: formattingScore,
      status: formattingStatus,
      items: formattingItems,
    },
    skillsAnalysis: {
      matchedPercentage: Math.min(95, Math.max(35, Math.round((foundSkills.length / 12) * 100))),
      topFoundSkills: foundSkills.slice(0, 12),
      missingKeywords: suggestedMissing,
    },
    strengths,
    weaknesses,
    recommendations,
    meta: {
      wordCount,
      numPages,
      detectedActionVerbs: foundActionVerbs.length,
      detectedMetrics: uniqueMetricsCount,
      hasEmail,
      hasPhone,
    },
  };
}

module.exports = {
  calculateATSScore,
};
