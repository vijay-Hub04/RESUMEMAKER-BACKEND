/**
 * Job ATS Matcher Utility
 * Compares candidate's extracted skills & resume text against job description & requirements.
 */

/**
 * Calculate ATS Match Score between candidate resume and a job posting
 * @param {Object} resume - Candidate resume object { parsedText, atsResult, atsScore }
 * @param {Object} job - Job object { title, skills, description }
 * @returns {Object} Match analysis { matchScore, matchLevel, matchingSkills, missingSkills, matchSummary }
 */
function calculateJobMatch(resume, job) {
  if (!job) {
    return {
      matchScore: 60,
      matchLevel: 'Moderate',
      matchingSkills: [],
      missingSkills: [],
      matchSummary: 'No job details provided for comparison.',
    };
  }

  // 1. Collect candidate skills & text
  const resumeText = (resume?.parsedText || '').toLowerCase();
  const candidateSkills = (resume?.atsResult?.skillsAnalysis?.topFoundSkills || []).map((s) =>
    s.toLowerCase()
  );

  const jobSkills = Array.isArray(job.skills) ? job.skills : [];
  const jobTitle = (job.title || '').toLowerCase();
  const jobDesc = (job.description || '').toLowerCase();

  // If candidate has no resume uploaded yet, provide baseline
  if (!resumeText && candidateSkills.length === 0) {
    return {
      matchScore: null,
      matchLevel: 'Unranked',
      matchingSkills: [],
      missingSkills: jobSkills,
      matchSummary: 'Upload or analyze your resume to calculate personalized match score.',
    };
  }

  // 2. Evaluate skill overlap
  const matchingSkills = [];
  const missingSkills = [];

  jobSkills.forEach((skill) => {
    const sLower = skill.toLowerCase();
    const inSkillsList = candidateSkills.some(
      (cs) => cs === sLower || cs.includes(sLower) || sLower.includes(cs)
    );
    const inResumeText = resumeText.includes(sLower);

    if (inSkillsList || inResumeText) {
      matchingSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  // 3. Title / Domain relevance
  let titleBonus = 0;
  const titleWords = jobTitle.split(/\s+/).filter((w) => w.length > 3);
  titleWords.forEach((word) => {
    if (resumeText.includes(word)) {
      titleBonus += 4;
    }
  });
  titleBonus = Math.min(15, titleBonus);

  // 4. Calculate weighted score
  const totalSkillsCount = Math.max(1, jobSkills.length);
  const skillRatio = matchingSkills.length / totalSkillsCount;
  
  // Base skill match (up to 70 points)
  let calculatedScore = Math.round(skillRatio * 70) + titleBonus;

  // Baseline credit for candidate's overall ATS score if high quality
  if (resume?.atsScore) {
    calculatedScore += Math.round((resume.atsScore / 100) * 15);
  } else {
    calculatedScore += 10;
  }

  // Clamp between 35% and 98%
  const matchScore = Math.min(98, Math.max(35, calculatedScore));

  // Determine label & badge
  let matchLevel = 'Moderate';
  if (matchScore >= 85) matchLevel = 'High Match';
  else if (matchScore >= 70) matchLevel = 'Good Match';
  else if (matchScore < 55) matchLevel = 'Low Match';

  const matchSummary =
    matchingSkills.length > 0
      ? `Matches ${matchingSkills.length} of ${jobSkills.length} required skills for ${job.title}.`
      : `Consider strengthening your profile with ${missingSkills.slice(0, 3).join(', ')}.`;

  return {
    matchScore,
    matchLevel,
    matchingSkills,
    missingSkills,
    matchSummary,
  };
}

module.exports = {
  calculateJobMatch,
};
