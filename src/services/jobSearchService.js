const https = require("https");

/**
 * Common tech skills for taxonomy matching in live job descriptions
 */
const KNOWN_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "SQL",
  "React", "Next.js", "Vue.js", "Angular", "Redux", "Tailwind CSS", "HTML5", "CSS3",
  "Node.js", "Express.js", "NestJS", "FastAPI", "Django", "Spring Boot", "REST APIs", "GraphQL",
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch", "AWS", "Azure", "GCP", "Docker",
  "Kubernetes", "CI/CD", "Git", "Terraform", "Linux", "Jest", "Cypress"
];

// In-memory cache for live web jobs (5 minutes TTL) to prevent rate limits
let cachedLiveJobs = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch raw JSON from an external HTTPS endpoint
 */
function httpsGetJson(url) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "CareerAI-LiveJobFetcher/2.0 (Modern ATS Job Platform)",
          Accept: "application/json",
        },
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return resolve(null);
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );

    req.on("error", () => resolve(null));
    req.setTimeout(7000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Extract clean skills from job text & tags
 */
function detectSkillsFromJob(text, existingTags = []) {
  const combined = (text + " " + existingTags.join(" ")).toLowerCase();
  const found = [];

  KNOWN_SKILLS.forEach((skill) => {
    const sLower = skill.toLowerCase();
    if (combined.includes(sLower)) {
      found.push(skill);
    }
  });

  // If few specific skills detected, retain original tags
  if (found.length < 2 && existingTags.length > 0) {
    existingTags.slice(0, 4).forEach((t) => {
      if (typeof t === "string" && t.length > 2 && !found.includes(t)) {
        found.push(t);
      }
    });
  }

  return found.length > 0 ? found : ["Software Engineering", "Problem Solving"];
}

/**
 * Generate live deep-search links for LinkedIn, Naukri, Indeed, and Google Jobs
 */
function attachLivePlatformLinks(job) {
  const query = encodeURIComponent(`${job.title} ${job.company}`);
  const location = encodeURIComponent(job.location || "Remote");

  return {
    ...job,
    linkedinSearchUrl: `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${location}`,
    naukriSearchUrl: `https://www.naukri.com/${query.replace(/%20/g, "-")}-jobs?k=${query}`,
    indeedSearchUrl: `https://www.indeed.com/jobs?q=${query}&l=${location}`,
    googleJobsUrl: `https://www.google.com/search?q=${query}+jobs+in+${location}&ibp=htl;jobs`,
  };
}

/**
 * Fetch 100% live job postings directly from the web
 */
async function fetchAllLiveWebJobs() {
  const now = Date.now();
  if (cachedLiveJobs.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLiveJobs;
  }

  try {
    // 1. Fetch from live web APIs concurrently
    const [arbeitData, jobicyData] = await Promise.all([
      httpsGetJson("https://www.arbeitnow.com/api/job-board-api"),
      httpsGetJson("https://jobicy.com/api/v2/remote-jobs?count=30"),
    ]);

    const liveList = [];

    // 2. Process Arbeitnow live web postings
    if (arbeitData?.data && Array.isArray(arbeitData.data)) {
      arbeitData.data.forEach((item, idx) => {
        const rawDesc = (item.description || "").replace(/<[^>]*>?/gm, " ").trim();
        const skills = detectSkillsFromJob(item.title + " " + rawDesc, item.tags || []);

        liveList.push({
          id: "web-a-" + (item.slug || `job-${idx}`),
          title: item.title || "Software Engineer",
          company: item.company_name || "Tech Company",
          logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            item.company_name || "TC"
          )}&background=6366f1&color=fff&bold=true`,
          location: item.location ? (item.remote ? `${item.location} (Remote)` : item.location) : "Remote",
          type: item.remote ? "Remote" : "Full-time",
          experience: "2-5 years",
          salary: "Competitive Market Rate",
          postedDate: item.created_at
            ? new Date(item.created_at * 1000).toLocaleDateString()
            : "Recently posted",
          skills,
          applyUrl: item.url,
          description: rawDesc.slice(0, 320) + (rawDesc.length > 320 ? "..." : ""),
          responsibilities: [
            "Contribute to scalable architecture and production deployment cycles.",
            "Write clean, testable, and maintainable code adhering to industry standards.",
            "Collaborate with cross-functional engineering and product squads.",
          ],
          source: "Live Web (Arbeitnow)",
        });
      });
    }

    // 3. Process Jobicy live remote web postings
    if (jobicyData?.jobs && Array.isArray(jobicyData.jobs)) {
      jobicyData.jobs.forEach((item, idx) => {
        const rawDesc = (item.jobDescription || item.jobExcerpt || "").replace(/<[^>]*>?/gm, " ").trim();
        const rawTags = Array.isArray(item.jobIndustry) ? item.jobIndustry.flat() : [];
        const skills = detectSkillsFromJob(item.jobTitle + " " + rawDesc, rawTags);

        let salaryStr = "Competitive Market Rate";
        if (item.salaryMin && item.salaryMax) {
          salaryStr = `${item.salaryCurrency || "$"} ${item.salaryMin.toLocaleString()} - ${item.salaryMax.toLocaleString()} / yr`;
        }

        liveList.push({
          id: "web-j-" + (item.id || `jobicy-${idx}`),
          title: item.jobTitle || "Software Developer",
          company: item.companyName || "Remote Org",
          logo:
            item.companyLogo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              item.companyName || "RO"
            )}&background=06b6d4&color=fff&bold=true`,
          location: item.jobGeo || "Remote, Global",
          type: item.jobType || "Remote",
          experience: item.jobLevel || "Mid - Senior",
          salary: salaryStr,
          postedDate: item.pubDate
            ? new Date(item.pubDate).toLocaleDateString()
            : "Recently posted",
          skills,
          applyUrl: item.url,
          description: rawDesc.slice(0, 320) + (rawDesc.length > 320 ? "..." : ""),
          responsibilities: [
            "Design and ship high-impact features with end-to-end reliability.",
            "Review pull requests and participate in architectural brainstorming.",
            "Monitor live application performance and handle production debugging.",
          ],
          source: "Live Web (Jobicy)",
        });
      });
    }

    if (liveList.length > 0) {
      cachedLiveJobs = liveList;
      cacheTimestamp = now;
      return liveList;
    }
  } catch (err) {
    console.warn("[jobSearchService] Live web fetch warning:", err.message);
  }

  return cachedLiveJobs;
}

/**
 * Search 100% live jobs based on query filters and candidate resume skills
 */
async function searchLiveJobs(options = {}) {
  const {
    search = "",
    location = "",
    type = "",
    experience = "",
    candidateSkills = [],
  } = options;

  // 1. Fetch live real-time jobs from web
  const allLiveJobs = await fetchAllLiveWebJobs();
  let results = [...allLiveJobs];

  // 2. Filter by keyword search if provided
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.skills.some((s) => s.toLowerCase().includes(q))
    );
  }

  // 3. Filter by location if specified
  if (location && location !== "All" && location.trim()) {
    const loc = location.trim().toLowerCase();
    results = results.filter((j) => j.location.toLowerCase().includes(loc));
  }

  // 4. Filter by type (e.g. Remote, Full-time)
  if (type && type !== "All") {
    const t = type.toLowerCase();
    results = results.filter(
      (j) =>
        j.type.toLowerCase().includes(t) ||
        (t === "remote" && j.location.toLowerCase().includes("remote"))
    );
  }

  // 5. Filter by experience
  if (experience && experience !== "All") {
    const exp = experience.toLowerCase();
    results = results.filter((j) => j.experience.toLowerCase().includes(exp));
  }

  // 6. If candidate resume skills exist and no specific query is searched,
  // prioritize live jobs matching candidate's tech stack
  if (candidateSkills && candidateSkills.length > 0 && !search) {
    results.sort((a, b) => {
      const aOverlap = a.skills.filter((s) =>
        candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
      ).length;
      const bOverlap = b.skills.filter((s) =>
        candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
      ).length;
      return bOverlap - aOverlap;
    });
  }

  // 7. Attach live deep-search platform links (LinkedIn, Naukri, Indeed)
  return results.map(attachLivePlatformLinks);
}

/**
 * Get single live job by ID
 */
async function getLiveJobById(id) {
  const allLiveJobs = await fetchAllLiveWebJobs();
  const job = allLiveJobs.find((j) => j.id === id);
  if (!job) return null;
  return attachLivePlatformLinks(job);
}

module.exports = {
  searchLiveJobs,
  getLiveJobById,
};
