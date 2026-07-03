import { db } from "@/services/firebase/config";
import { addDoc, collection } from "firebase/firestore";
import { recordDeal } from "./financialService";
import { calculateAdjustedBudget } from "./marketplaceService";
import { safeString, safeSkills, safeNumber, safeArray } from "@/utils/safe";
import type { MatchResult } from "@/types";
import { RequirementRepository } from "../repositories/RequirementRepository";
import { CandidateRepository } from "../repositories/CandidateRepository";
import { executeAITask } from "@/utils/aiGateway";

/**
 * JOB POSTING: Initial trigger for marketplace
 */
export async function processNewJob(job: any) {
  // 1. Calculate Adjusted Budget (HireNest Margin)
  const adjustedBudget = await calculateAdjustedBudget(job.companyId || job.company_id, job.budget);
  
  // 2. Update Job in DB
  await RequirementRepository.update(job.id, { adjustedBudget } as any);

  // 3. Log System Action
  await addDoc(collection(db, 'agent_logs'), {
    type: 'revenue',
    level: 'info',
    message: `[CFO AGENT] Budget adjusted for ${job.title}. Client Gross: ₹${job.budget} -> Vendor Net: ₹${adjustedBudget}`,
    metadata: { jobId: job.id, gross: job.budget, net: adjustedBudget },
    createdAt: new Date().toISOString()
  });
}

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  currentTitle: string;
  skills: string[];
  experience: string;
  education: string;
  summary: string;
}

/**
 * Parses raw resume text into structured JSON using Gemini via AI Gateway
 */
export async function parseResumeWithAI(text: string): Promise<ParsedResume> {
  const prompt = `
    Analyze the following resume text and extract structured information.
    Return ONLY a JSON object with this structure:
    {
      "name": "full name",
      "email": "email address",
      "phone": "phone number",
      "currentTitle": "current or most recent job title",
      "skills": ["skill1", "skill2"],
      "experience": "brief summary of years and key roles",
      "education": "highest degree and institution",
      "summary": "professional summary"
    }
    
    TEXT:
    ${text.substring(0, 5000)}
  `;

  try {
    const cleanText = await executeAITask({
      agentName: "Resume-Parser",
      prompt,
      metadata: { textLength: text.length }
    });

    const parsed = JSON.parse(cleanText || "{}");
    return {
      name: safeString(parsed.name || "Unknown"),
      email: safeString(parsed.email || ""),
      phone: safeString(parsed.phone || ""),
      currentTitle: safeString(parsed.currentTitle || ""),
      skills: safeSkills(parsed.skills),
      experience: safeString(parsed.experience || ""),
      education: safeString(parsed.education || ""),
      summary: safeString(parsed.summary || "")
    };
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return {
      name: "Unknown",
      email: "",
      phone: "",
      currentTitle: "",
      skills: [],
      experience: "",
      education: "",
      summary: ""
    };
  }
}

/**
 * Matching Engine: Semantic comparison between Requirement and Candidate
 */
export async function scoreCandidateForJob(job: any, candidate: any): Promise<MatchResult> {
  const jobTitle = safeString(job?.title);
  const jobSkills = safeSkills(job?.skills);
  const jobDesc = safeString(job?.description);
  
  const candName = safeString(candidate?.name);
  const candTitle = safeString(candidate?.currentTitle || candidate?.current_title);
  const candSkills = safeSkills(candidate?.skills);
  const candSummary = safeString(candidate?.summary || candidate?.experience || candidate?.description);

  const prompt = `
    Act as a Senior Technical IT Recruiter with 20+ years of experience in hiring for top Silicon Valley firms.
    Your task is to conduct a deep neural match between a Job Requisition and a Candidate Profile.
    
    JOB SPECIFICATIONS:
    Title: ${jobTitle}
    Target Skills: ${jobSkills.join(", ")}
    Comprehensive Description: ${jobDesc}
    
    CANDIDATE DOSSIER:
    Name: ${candName}
    Current/Recent Role: ${candTitle}
    Stated Skills: ${candSkills.join(", ")}
    Professional Background: ${candSummary}
    
    EVALUATION CRITERIA:
    1. Technical Alignment: How well do the candidate's skills map to the job requirements?
    2. Role Context: Does the candidate's recent experience justify the seniority of the role?
    3. Gap Analysis: What critical skills or experience are missing? Be specific.
    4. Readiness: Is this candidate a "Plug-and-Play" hire or does he/she need significant training?
    
    Return ONLY a JSON object with this exact structure:
    {
      "score": number (0-100),
      "reasoning": "High-level summary of fit (1-2 sentences)",
      "gaps": ["specific missing skill 1", "missing experience in X"],
      "recommendation": "shortlist" | "reserve" | "reject",
      "missing_info": ["What is missing from resume that would help better evaluate? e.g. Github link, specific tech stack versions, project details"]
    }
  `;

  try {
    const rawResult = await executeAITask({
      agentName: "Matching-Engine",
      prompt,
      metadata: { jobId: job?.id, candidateId: candidate?.id }
    });

    const result = JSON.parse(rawResult || "{}");
    
    return {
      score: safeNumber(result.score),
      reasoning: safeString(result.reasoning || "Evaluation complete."),
      gaps: safeArray(result.gaps),
      recommendation: (result.recommendation || 'reject') as any,
      missing_info: safeArray(result.missing_info)
    } as any;
  } catch (error) {
    console.error("AI Matching Error:", error);
    return { 
      score: 0, 
      reasoning: "The Intelligence Engine encountered an abstraction error while processing this profile.", 
      gaps: ["Evaluation system instability"], 
      recommendation: 'reject',
      missing_info: ["Candidate profile might be corrupted or too brief for analysis."]
    } as any;
  }
}

/**
 * Autonomous Decision Agent: The "Brain" that runs the pipeline
 */
export async function runDecisionAgent() {
  // 1. Log Start
  await addDoc(collection(db, 'agent_logs'), {
    type: 'decision',
    message: 'Autonomous Decision Agent cycle started.',
    level: 'info',
    createdAt: new Date().toISOString()
  });

  // 2. Find Pending Candidates
  const candidates = await CandidateRepository.list();
  const pendingCandidates = candidates.filter(c => c.stage === 'screening');

  if (!pendingCandidates || pendingCandidates.length === 0) {
    return "No pending candidates in screening.";
  }

  // 3. Find Open Jobs
  const jobs = await RequirementRepository.list();
  const openJobs = jobs.filter(j => j.status === 'open');

  if (!openJobs || openJobs.length === 0) {
    return "No open jobs found.";
  }

  let decisions = 0;
  let reviews = 0;

  for (const candidate of pendingCandidates) {
    let bestMatch: any = null;
    
    for (const job of openJobs) {
       const evaluation = await scoreCandidateForJob(job, candidate);
       
       // 3-TIER DECISIONING & GUARDRAILS
       // Tier 1: Auto-Shortlist (Very high confidence)
       if (evaluation.recommendation === 'shortlist' && evaluation.score >= 85) {
         if (!bestMatch || evaluation.score > bestMatch.score) {
           bestMatch = { job, evaluation, tier: 'auto' };
         }
       } 
       // Tier 2: Human Review Priority
       else if (evaluation.score >= 70) {
         reviews++;
         await CandidateRepository.update(candidate.id, {
           stage: 'review',
           notes: `[AI REVIEW QUEUE] High potential match (${evaluation.score}%). Reasoning: ${evaluation.reasoning}`
         });
       }
    }

    if (bestMatch && bestMatch.tier === 'auto') {
      // AUTO-MOVE: This is the decision!
      await CandidateRepository.update(candidate.id, {
        stage: 'interview',
        notes: `[AI AUTONOMOUS DECISION] Auto-Shortlisted for ${bestMatch.job.title}. Match: ${bestMatch.evaluation.score}%. Reasoning: ${bestMatch.evaluation.reasoning}`
      });
      
      // CFO LAYER: Record potential revenue
      const estimatedValue = 150000; // Mock 15% of annual salary ₹10L
      await recordDeal(bestMatch.job, candidate, estimatedValue);
      
      decisions++;
    }
  }

  // 4. Log Completion
  await addDoc(collection(db, 'agent_logs'), {
    type: 'decision',
    message: `Cycle complete. Processed ${pendingCandidates.length} profiles. Auto-Shortlisted: ${decisions} | Flagged for Review: ${reviews}.`,
    level: 'success',
    status: 'finished',
    createdAt: new Date().toISOString()
  });

  return `Cycle complete. Made ${decisions} decisions.`;
}
