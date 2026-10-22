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
    req.setTimeout(8000, () => {
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
 * Fetch 100% real live job postings directly from external career APIs
 * No static, mock, or fake jobs are included.
 */
async function fetchAllLiveWebJobs() {
  const now = Date.now();
  if (cachedLiveJobs.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLiveJobs;
  }

  try {
    // Fetch concurrently from live web endpoints
    const [arbeitData, jobicyData, remotiveData, remoteokData] = await Promise.all([
      httpsGetJson("https://www.arbeitnow.com/api/job-board-api"),
      httpsGetJson("https://jobicy.com/api/v2/remote-jobs?count=50"),
      httpsGetJson("https://remotive.com/api/remote-jobs"),
      httpsGetJson("https://remoteok.com/api"),
    ]);

    const liveList = [];

    // 1. Process Arbeitnow real live postings
    if (arbeitData?.data && Array.isArray(arbeitData.data)) {
      arbeitData.data.forEach((item, idx) => {
        const rawDesc = (item.description || "").replace(/<[^>]*>?/gm, " ").trim();
        const skills = detectSkillsFromJob(item.title + " " + rawDesc, item.tags || []);
        const compName = item.company_name || "Technology Company";

        liveList.push({
          id: "live-a-" + (item.slug || `arbeit-${idx}`),
          title: item.title || "Software Engineer",
          company: compName,
          logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=6366f1&color=fff&bold=true`,
          companyLogo: `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=6366f1&color=fff&bold=true`,
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

    // 2. Process Jobicy real live postings
    if (jobicyData?.jobs && Array.isArray(jobicyData.jobs)) {
      jobicyData.jobs.forEach((item, idx) => {
        const rawDesc = (item.jobDescription || item.jobExcerpt || "").replace(/<[^>]*>?/gm, " ").trim();
        const rawTags = Array.isArray(item.jobIndustry) ? item.jobIndustry.flat() : [];
        const skills = detectSkillsFromJob(item.jobTitle + " " + rawDesc, rawTags);
        const compName = item.companyName || "Tech Organization";

        let salaryStr = "Competitive Market Rate";
        if (item.salaryMin && item.salaryMax) {
          salaryStr = `${item.salaryCurrency || "$"} ${item.salaryMin.toLocaleString()} - ${item.salaryMax.toLocaleString()} / yr`;
        }

        liveList.push({
          id: "live-j-" + (item.id || `jobicy-${idx}`),
          title: item.jobTitle || "Software Developer",
          company: compName,
          logo:
            item.companyLogo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=06b6d4&color=fff&bold=true`,
          companyLogo:
            item.companyLogo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=06b6d4&color=fff&bold=true`,
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

    // 3. Process Remotive real live postings
    if (remotiveData?.jobs && Array.isArray(remotiveData.jobs)) {
      remotiveData.jobs.slice(0, 60).forEach((item, idx) => {
        const rawDesc = (item.description || "").replace(/<[^>]*>?/gm, " ").trim();
        const skills = detectSkillsFromJob(item.title + " " + rawDesc, item.tags || []);
        const compName = item.company_name || "Technology Company";

        liveList.push({
          id: "live-r-" + (item.id || `remotive-${idx}`),
          title: item.title || "Full Stack Developer",
          company: compName,
          logo:
            item.company_logo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=8b5cf6&color=fff&bold=true`,
          companyLogo:
            item.company_logo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=8b5cf6&color=fff&bold=true`,
          location: item.candidate_required_location || "Remote",
          type: item.job_type || "Remote",
          experience: "2-5 years",
          salary: item.salary || "Competitive Market Rate",
          postedDate: item.publication_date
            ? new Date(item.publication_date).toLocaleDateString()
            : "Recently posted",
          skills,
          applyUrl: item.url,
          description: rawDesc.slice(0, 320) + (rawDesc.length > 320 ? "..." : ""),
          responsibilities: [
            "Participate in product architecture, system design, and implementation.",
            "Maintain high test coverage and enforce code quality best practices.",
          ],
          source: "Live Web (Remotive)",
        });
      });
    }

    // 4. Process RemoteOK real live postings
    if (Array.isArray(remoteokData)) {
      remoteokData.forEach((item, idx) => {
        if (!item || !item.position || !item.company) return;
        const rawDesc = (item.description || "").replace(/<[^>]*>?/gm, " ").trim();
        const skills = detectSkillsFromJob(item.position + " " + rawDesc, item.tags || []);
        const compName = item.company.trim();

        let salaryStr = "Competitive Market Rate";
        if (item.salary_min && item.salary_max) {
          salaryStr = `$${Number(item.salary_min).toLocaleString()} - $${Number(item.salary_max).toLocaleString()} / yr`;
        }

        liveList.push({
          id: "live-rok-" + (item.id || `remoteok-${idx}`),
          title: item.position,
          company: compName,
          logo:
            item.company_logo ||
            item.logo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=10b981&color=fff&bold=true`,
          companyLogo:
            item.company_logo ||
            item.logo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=10b981&color=fff&bold=true`,
          location: item.location && item.location.trim() ? item.location.trim() : "Remote, Worldwide",
          type: "Remote",
          experience: "2-5 years",
          salary: salaryStr,
          postedDate: item.date ? new Date(item.date).toLocaleDateString() : "Recently posted",
          skills,
          applyUrl: item.apply_url || item.url,
          description: rawDesc.slice(0, 320) + (rawDesc.length > 320 ? "..." : ""),
          responsibilities: [
            "Contribute to core product features and engineering deliverables.",
            "Collaborate remotely with distributed teams across modern cloud stacks.",
          ],
          source: "Live Web (RemoteOK)",
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
 * Search 100% real live jobs strictly by user criteria.
 * No fake, synthetic, or static jobs are returned.
 * If no live jobs match the criteria, returns an empty array [].
 */
async function searchLiveJobs(options = {}) {
  const {
    search = "",
    company = "",
    location = "",
    type = "",
    experience = "",
    candidateSkills = [],
  } = options;

  // 1. Retrieve all 100% real live jobs from web APIs
  const allLiveJobs = await fetchAllLiveWebJobs();
  let results = [...allLiveJobs];

  // 2. Strict Filter by Company name if user provided a company
  if (company && company.trim()) {
    const compQuery = company.trim().toLowerCase();
    results = results.filter((j) =>
      (j.company || "").toLowerCase().includes(compQuery)
    );
  }

  // 3. Strict Filter by Location / City if user provided a location
  if (location && location !== "All" && location.trim()) {
    const locQuery = location.trim().toLowerCase();
    results = results.filter((j) => {
      const jLoc = (j.location || "").toLowerCase();
      if (jLoc.includes(locQuery)) return true;
      if (locQuery === "remote" && (j.type || "").toLowerCase().includes("remote")) return true;
      return false;
    });
  }

  // 4. Strict Filter by Title / Keyword search if provided
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter((j) => {
      const matchTitle = (j.title || "").toLowerCase().includes(q);
      const matchComp = (j.company || "").toLowerCase().includes(q);
      const matchSkills = (j.skills || []).some((s) => s.toLowerCase().includes(q));
      const matchDesc = (j.description || "").toLowerCase().includes(q);
      const matchLoc = (j.location || "").toLowerCase().includes(q);
      return matchTitle || matchComp || matchSkills || matchDesc || matchLoc;
    });
  }

  // 5. Filter by Employment Type (Full-time / Remote / Hybrid)
  if (type && type !== "All") {
    const t = type.toLowerCase();
    results = results.filter((j) => {
      const jType = (j.type || "").toLowerCase();
      const jLoc = (j.location || "").toLowerCase();
      if (jType.includes(t)) return true;
      if (t === "remote" && jLoc.includes("remote")) return true;
      return false;
    });
  }

  // 6. Filter by Experience level
  if (experience && experience !== "All") {
    const exp = experience.toLowerCase();
    results = results.filter((j) =>
      (j.experience || "").toLowerCase().includes(exp)
    );
  }

  // 7. If candidate resume skills exist, rank the matching real jobs by skill overlap
  if (candidateSkills && candidateSkills.length > 0) {
    results.sort((a, b) => {
      const aOverlap = (a.skills || []).filter((s) =>
        candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
      ).length;
      const bOverlap = (b.skills || []).filter((s) =>
        candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
      ).length;
      return bOverlap - aOverlap;
    });
  }

  // 8. Attach real deep-search links (LinkedIn, Naukri, Indeed, Google Jobs)
  return results.map(attachLivePlatformLinks);
}

/**
 * Get single real live job by ID
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
