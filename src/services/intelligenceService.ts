
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { recordDeal } from "./financialService";
import { calculateAdjustedBudget } from "./marketplaceService";
import { safeString, safeSkills, safeNumber, safeArray } from "@/utils/safe";
import type { MatchResult } from "@/types";
import { toast } from "sonner";

let aiClient: GoogleGenAI | null = null;

function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * JOB POSTING: Initial trigger for marketplace
 */
export async function processNewJob(job: any) {
  // 1. Calculate Adjusted Budget (HireNest Margin)
  const adjustedBudget = await calculateAdjustedBudget(job.company_id, job.budget);
  
  // 2. Update Job in DB
  await supabase
    .from('jobs')
    .update({ adjusted_budget: adjustedBudget })
    .eq('id', job.id);

  // 3. Log System Action
  await supabase.from('agent_logs').insert({
    type: 'revenue',
    level: 'info',
    message: `[CFO AGENT] Budget adjusted for ${job.title}. Client Gross: ₹${job.budget} -> Vendor Net: ₹${adjustedBudget}`,
    metadata: { jobId: job.id, gross: job.budget, net: adjustedBudget }
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
 * Parses raw resume text into structured JSON using Gemini 3 Flash
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
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const cleanText = response.text || "{}";
    return JSON.parse(cleanText);
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
 * Neural Matcher: Semantic comparison between Job and Candidate
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
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text?.trim() || "{}";
    const result = JSON.parse(text);
    
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
      reasoning: "The Neural Engine encountered an abstraction error while processing this profile.", 
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
  await supabase.from('agent_logs').insert({
    type: 'decision',
    message: 'Autonomous Decision Agent cycle started.',
    level: 'info'
  });

  // 2. Find Pending Candidates
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('stage', 'screening');

  if (!candidates || candidates.length === 0) return "No pending candidates in screening.";

  // 3. Find Open Jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'open');

  if (!jobs || jobs.length === 0) return "No open jobs found.";

  let decisions = 0;
  let reviews = 0;

  for (const candidate of candidates) {
    let bestMatch: any = null;
    
    for (const job of jobs) {
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
         await supabase.from('candidates').update({
           stage: 'review',
           notes: `[AI REVIEW QUEUE] High potential match (${evaluation.score}%). Reasoning: ${evaluation.reasoning}`
         }).eq('id', candidate.id);
       }
    }

    if (bestMatch && bestMatch.tier === 'auto') {
      // AUTO-MOVE: This is the decision!
      await supabase.from('candidates').update({
        stage: 'interview',
        notes: `[AI AUTONOMOUS DECISION] Auto-Shortlisted for ${bestMatch.job.title}. Match: ${bestMatch.evaluation.score}%. Reasoning: ${bestMatch.evaluation.reasoning}`
      }).eq('id', candidate.id);
      
      // CFO LAYER: Record potential revenue
      const estimatedValue = 150000; // Mock 15% of annual salary ₹10L
      await recordDeal(bestMatch.job, candidate, estimatedValue);
      
      decisions++;
    }
  }

  // 4. Log Completion
  await supabase.from('agent_logs').insert({
    type: 'decision',
    message: `Cycle complete. Processed ${candidates.length} profiles. Auto-Shortlisted: ${decisions} | Flagged for Review: ${reviews}.`,
    level: 'success',
    status: 'finished'
  });

  return `Cycle complete. Made ${decisions} decisions.`;
}
