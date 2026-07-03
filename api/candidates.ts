import { VercelRequest, VercelResponse } from "@vercel/node";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config();

let db: Firestore | null = null;
let adminApp: any = null;

if (!getApps()?.length) {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId,
      });
    }
    db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
} else {
  adminApp = getApps()[0];
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  } catch(err) {
    db = getFirestore(adminApp);
  }
}

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize Gemini Client
const apiKey = (process.env.GEMINI_API_KEY || "").replace(/^"|"$/g, "").replace(/^'|'$/g, "");
const ai = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.query;

  if (action === "submitVendorCandidate") {
    try {
      if (!db) throw new Error("Database not initialized");

      const { candidateHash, vendorId, candidateName, requirementId, identityData } = req.body;

      if (!candidateHash || !vendorId || !candidateName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check candidateOwnership
      const ownershipRef = db.collection("candidateOwnership");
      const existingQuery = await ownershipRef.where("candidateHash", "==", candidateHash).get();

      if (!existingQuery.empty) {
        const existing = existingQuery.docs[0].data();
        if (existing.vendorId !== vendorId) {
          return res.status(409).json({ 
            error: "Candidate Ownership Conflict", 
            message: `This profile is already owned by another entity across our network.` 
          });
        } else {
          return res.status(409).json({ 
            error: "Duplicate Submission", 
            message: `You have already claimed ownership of this profile.` 
          });
        }
      }

      // 1. Fetch Job / Requirement Details to perform BDM Routing & AI Screening
      let jobTitle = "General Talent Pool";
      let jobDescription = "Sourcing general talent pool candidates.";
      let jobSkills: string[] = [];
      let clientName = "Open Network";
      let jobLocation = "Remote";

      const reqId = requirementId || "UNKNOWN";

      if (reqId !== "UNKNOWN") {
        try {
          const jobDoc = await db.collection("requirements_private").doc(reqId).get();
          if (jobDoc.exists) {
            const jd = jobDoc.data();
            jobTitle = jd?.title || "Sourced Role";
            jobDescription = jd?.description || jd?.client || "";
            jobSkills = jd?.skills || [];
            clientName = jd?.client || "Enterprise Client";
            jobLocation = jd?.location || "Remote";
          } else {
            const pubDoc = await db.collection("requirements_public").doc(reqId).get();
            if (pubDoc.exists) {
              const jd = pubDoc.data();
              jobTitle = jd?.title || "Sourced Role";
              jobDescription = jd?.description || "";
              jobSkills = jd?.skills || [];
              clientName = jd?.client || "Enterprise Client";
              jobLocation = jd?.location || "Remote";
            }
          }
        } catch (err) {
          console.error("Error fetching requirement from Firestore:", err);
        }

        // Fallback to Supabase if General
        if (jobTitle === "General Talent Pool" && supabase) {
          try {
            const { data: sj } = await supabase.from("jobs").select("*").eq("id", reqId).single();
            if (sj) {
              jobTitle = sj.title || "Sourced Role";
              jobDescription = sj.description || "";
              jobSkills = Array.isArray(sj.skills) ? sj.skills : (sj.skills ? sj.skills.split(",") : []);
              clientName = sj.clientName || sj.client_name || "Enterprise Client";
              jobLocation = sj.location || "Remote";
            }
          } catch (err) {
            console.error("Error fetching requirement from Supabase:", err);
          }
        }
      }

      // 2. Perform BDM Routing
      let assignedBdm = "Ravi"; // Default
      const lowerTitle = jobTitle.toLowerCase();
      const lowerDesc = jobDescription.toLowerCase();
      const lowerClient = clientName.toLowerCase();

      if (lowerClient.includes("deloitte") || lowerTitle.includes("deloitte") || lowerDesc.includes("deloitte")) {
        assignedBdm = "Rahul";
      } else if (lowerClient.includes("accenture") || lowerTitle.includes("accenture") || lowerDesc.includes("accenture")) {
        assignedBdm = "Priya";
      } else if (lowerDesc.includes("bangalore") || lowerDesc.includes("bengaluru") || jobLocation.toLowerCase().includes("bangalore")) {
        assignedBdm = "Priya";
      } else if (lowerTitle.includes("sap") || lowerDesc.includes("sap")) {
        assignedBdm = "Rahul";
      }

      // 3. Perform AI Resume Screening using Gemini
      let aiMatchScore = 75;
      let aiSummary = "Vetted profile awaiting BDM review.";
      let fraudDetected = false;
      let skillsList = identityData.skills || [];

      if (ai) {
        try {
          const evaluationPrompt = `
            Act as the Staffing Intelligence Analyzer for HireNestOS.
            Evaluate the candidate's details against the job requirement and return a structured JSON evaluation.

            CANDIDATE DETAILS:
            Name: ${candidateName}
            Email: ${identityData.email || ""}
            Phone: ${identityData.phone || ""}
            Current Title: ${identityData.current_title || ""}
            Skills Provided: ${JSON.stringify(identityData.skills || [])}
            Cover Note: ${identityData.cover_note || ""}

            JOB REQUIREMENT DETAILS:
            Title: ${jobTitle}
            Description: ${jobDescription}
            Required Skills: ${JSON.stringify(jobSkills)}

            TASK:
            1. Calculate a match percentage (0 to 100) based on skill overlap, experience level, and relevance.
            2. Formulate a 2-3 sentence AI candidate profile summary / evaluation.
            3. Detect potential fraud markers (disposable emails, mismatched phone numbers, or extreme text anomalies). Return fraudDetected as true or false.
            4. Extract skills list as a JSON array of strings.

            RETURN ONLY VALID JSON MATCHING THIS SCHEMA:
            {
              "matchScore": 85,
              "summary": "Evaluation text here",
              "fraudDetected": false,
              "skills": ["skill1", "skill2"]
            }
          `;

          const result = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: evaluationPrompt,
            config: {
              responseMimeType: "application/json",
            },
          });

          const cleanText = (result.text || "")
            .replace(/\`\`\`json|\`\`\`/g, "")
            .trim();
          const evaluation = JSON.parse(cleanText);

          if (evaluation.matchScore !== undefined) aiMatchScore = Number(evaluation.matchScore);
          if (evaluation.summary) aiSummary = evaluation.summary;
          if (evaluation.fraudDetected !== undefined) fraudDetected = !!evaluation.fraudDetected;
          if (Array.isArray(evaluation.skills)) skillsList = evaluation.skills;

        } catch (err) {
          console.error("Gemini processing failed, using fallbacks:", err);
        }
      }

      // Validate done - create ownership
      const payload = {
        candidateHash,
        vendorId,
        candidateName,
        createdAt: new Date().toISOString(),
        source: "vendor",
        identityData,
      };

      await ownershipRef.add(payload);
      
      // Create Firebase Candidates Pool
      const candRef = await db.collection("candidates").add({
        name: candidateName,
        vendorId: vendorId,
        vendor_company_id: vendorId,
        stage: "submission",
        source: "vendor_submit",
        created_at: new Date().toISOString(),
        assignedBdm,
        aiMatchScore,
        fraudDetected,
        notes: aiSummary,
        skills: skillsList,
        ...identityData
      });

      // Sync to candidatePool
      await db.collection("candidatePool").add({
        name: candidateName,
        vendorId: vendorId,
        stage: "submission",
        source: "vendor",
        createdAt: new Date().toISOString(),
        assignedBdm,
        aiMatchScore,
        fraudDetected,
        notes: aiSummary,
        skills: skillsList,
        ...identityData
      });

      // Add to submission_ledger
      await db.collection("submission_ledger").add({
        requirementId: reqId,
        candidateId: candRef.id,
        vendorId: vendorId,
        ownershipHash: candidateHash,
        submittedAt: new Date().toISOString(),
        status: "submitted",
        assignedBdm,
        aiMatchScore
      });

      // Add to activity_ledger
      await db.collection("activity_ledger").add({
        entityType: "candidate_submission",
        entityId: candRef.id,
        event: "candidate_submitted",
        performedBy: vendorId,
        timestamp: new Date().toISOString(),
        metadata: {
          vendorId,
          candidateHash,
          requirementId: reqId,
          assignedBdm,
          aiMatchScore
        }
      });

      // LAW 1: Log to immutable Company Ledger
      await db.collection("system_events").add({
        type: "CANDIDATE_SUBMITTED",
        message: `Vendor submitted candidate ${candidateName} for requirement ${jobTitle}. Assigned to BDM ${assignedBdm} (AI Match: ${aiMatchScore}%).`,
        timestamp: new Date().toISOString(),
        entityType: "candidate",
        entityId: candRef.id,
        role: "system",
        data: {
          candidateName,
          requirementId: reqId,
          vendorId,
          assignedBdm,
          aiMatchScore,
          fraudDetected
        }
      });

      // 4. Sync directly to Supabase Candidates table to maintain Parity
      let supabaseCandidateId = null;
      if (supabase) {
        try {
          const { data: sCand, error: sCandErr } = await supabase
            .from("candidates")
            .insert({
              name: candidateName,
              email: identityData.email || null,
              phone: identityData.phone || null,
              skills: skillsList,
              experience: identityData.experience || "0",
              current_title: identityData.current_title || null,
              stage: "submission",
              vendor_company_id: vendorId,
              resume_url: identityData.resume_url || null,
              source: "vendor",
              ai_match_score: aiMatchScore,
              linkedin_url: identityData.linkedin || null,
              summary: aiSummary,
              status: fraudDetected ? "flagged" : "active"
            })
            .select()
            .single();

          if (sCandErr) {
            console.error("Supabase sync error:", sCandErr.message);
          } else if (sCand) {
            supabaseCandidateId = sCand.id;
            // Also link in job_submissions
            if (reqId !== "UNKNOWN") {
              await supabase.from("job_submissions").insert({
                job_id: reqId,
                candidate_id: sCand.id,
                status: "pending"
              });
            }
          }
        } catch (sErr) {
          console.error("Supabase write failure:", sErr);
        }
      }

      return res.status(200).json({ 
        success: true, 
        candidateId: candRef.id,
        supabaseCandidateId,
        assignedBdm,
        aiMatchScore,
        fraudDetected,
        aiSummary
      });

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Invalid action" });
}
