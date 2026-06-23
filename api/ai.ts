import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action || (req.body && req.body.action);
  switch (action) {
    case 'classify':
      return await (async () => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { text, context, emailId } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing text parameter" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
    const aiClient = new GoogleGenAI({ apiKey });

    const prompt = `
    Act as the "Unified Intelligence Brain" for HireNest Enterprise IT Staffing OS.
    Analyze the following interaction (Email, text, JD, or WhatsApp) and extract staffing workflows.
    
    If the text resembles an email with a job requirement, focus tightly on extracting the requirement details.
    If the text resembles a submission from a vendor, focus on extracting the candidate details.
    If the text resembles an interview schedule or request, focus on extracting the interview details.

    INTERACTION TEXT:
    "${text}"

    CONTEXT:
    ${JSON.stringify(context || {})}

    TASKS:
    1. PROFILE: Determine the business intent. You MUST classify the intent as exactly one of the following staffing categories: "Requirement", "Vendor Submission", "Interview", "Offer", "Joining", "Invoice", "Spam", "Other". NEVER use generic classes unless absolutely necessary.
    
    EXAMPLES FOR CLASSIFICATION:
    - "Client: Witty Brains, Location: Noida, Budget: 7 LPA, Need testing engineer...": Intent -> "Requirement"
    - "JD For Software Engineer...": Intent -> "Requirement"
    - "Please find attached profiles from ProcessQ for Java dev...": Intent -> "Vendor Submission"
    - "Attached 4 Java Profiles": Intent -> "Vendor Submission"
    - "Candidate scheduled for L1 Technical on 20 Jun with Deloitte...": Intent -> "Interview"
    - "Interview scheduled tomorrow 11:30 AM": Intent -> "Interview"

    2. PITCH: Generate a short, conversion-focused pitch (email/WhatsApp style) in response to advance the workflow.
    3. FOLLOW-UP: Decide if we should follow up and when.
    4. EXTRACTION: 
       - If "Requirement", extract properties: { client, title, location, experience, employmentType, budget, workMode, status }. 
       - If "Vendor Submission", extract properties: { candidateName, vendorName, experience, skills, noticePeriod }.
       - If "Interview", extract properties: { client, candidates, interviewType, date, status }.

    8. CONFIDENCE: Provide a confidence score (0.0 to 1.0) for your classification based on how clear the text is.

    RETURN ONLY VALID JSON MATCHING THIS EXACT SCHEMA:
    {
      "profile": {
        "intent": "Requirement" | "Vendor Submission" | "Interview" | "Offer" | "Joining" | "Invoice" | "Spam" | "Other",
        "confidence": 0.95,
        "roles": ["Role 1", "Role 2"],
        "urgency": "high" | "medium" | "low",
        "budget": "high" | "mid" | "low",
        "sentiment": "string"
      },
      "pitch": "string",
      "followUp": {
        "suggested": true|false,
        "reason": "string",
        "timeline": "e.g. 24 hours"
      },
      "extractedRequirement": {
        "client": "string",
        "title": "string",
        "location": "string",
        "experience": "string",
        "skills": ["skill 1", "skill 2"],
        "employmentType": "FTE | C2C | C2H",
        "budget": "string",
        "workMode": "Onsite | Hybrid | Remote",
        "status": "Open"
      },
      "extractedSubmission": {
        "candidateName": "string",
        "vendorName": "string",
        "experience": "string",
        "skills": ["skill 1"],
        "noticePeriod": "string"
      },
      "extractedInterview": {
        "client": "string",
        "candidates": ["string"],
        "interviewType": ["string"],
        "date": "string",
        "status": "scheduled"
      }
    }
  `;

    const result = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const cleanText = (result.text || "")
      .replace(/\`\`\`json|\`\`\`/g, "")
      .trim();
    const insight = JSON.parse(cleanText);

    // Auto-log to Firestore
    if (db) {
      await db.collection("system_events").add({
        type: "brain_process",
        message: `AI Brain processed interaction: ${insight.profile.intent}`,
        timestamp: new Date().toISOString(),
        data: {
          emailId: emailId || null,
          intent: insight.profile.intent,
          confidence: insight.profile.confidence,
        },
      });

      await db.collection("classification_audit").add({
        emailId: emailId || null,
        classification: insight.profile.intent,
        confidence: insight.profile.confidence || 0.8,
        validated: false,
        createdAt: new Date().toISOString(),
      });

      if (
        insight.profile.intent === "Requirement" &&
        insight.extractedRequirement &&
        (insight.profile.confidence || 0.8) > 0.8
      ) {
        const reqData = {
          title: insight.extractedRequirement.title || "Unknown Role",
          client: insight.extractedRequirement.client || "Unknown Client",
          location: insight.extractedRequirement.location || "",
          employmentType: insight.extractedRequirement.employmentType || "Full-time",
          budget: insight.extractedRequirement.budget || "",
          experience: insight.extractedRequirement.experience || "",
          skills: insight.extractedRequirement.skills || [],
          source: "mailos",
          sourceEmailId: emailId,
          status: "Open",
          createdBy: "mailos",
          createdAt: new Date().toISOString(),
          confidence: insight.profile.confidence || 0.9,
          requiresReview: (insight.profile.confidence || 0.9) < 0.95
        };
        
        const reqRef = await db.collection("requirements_private").add(reqData);

        // Sync sanitized version to public collection
        const publicReqData = {
          title: reqData.title,
          location: reqData.location,
          employmentType: reqData.employmentType,
          experience: reqData.experience,
          skills: reqData.skills,
          status: reqData.status,
          source: reqData.source,
          createdBy: "system",
          createdAt: reqData.createdAt,
          confidence: reqData.confidence,
          requiresReview: reqData.requiresReview,
          parentRequirementId: reqRef.id
        };
        await db.collection("requirements_public").doc(reqRef.id).set(publicReqData);

        await db.collection("system_events").add({
          type: "lifecycle_automation",
          message: `Automated Requirement Created: ${insight.extractedRequirement.title}`,
          timestamp: new Date().toISOString(),
          data: { event: "RequirementCreated", requirementId: reqRef.id },
          // AgentRuntime integration
          event: "requirement.created",
          status: "pending",
          payload: { requirementId: reqRef.id }
        });

        await db.collection("system_events").add({
          type: "lifecycle_automation",
          message: `Requirement Broadcasted to Vendor Network: ${insight.extractedRequirement.title}`,
          timestamp: new Date().toISOString(),
          data: { event: "VendorBroadcast", requirementId: reqRef.id },
        });
      }

      if (
        insight.profile.intent === "Vendor Submission" &&
        insight.extractedSubmission &&
        (insight.profile.confidence || 0.8) > 0.8
      ) {
        const candData = {
          name: insight.extractedSubmission.candidateName || "Unknown Candidate",
          source: "mailos",
          createdBy: "mailos",
          vendorName: insight.extractedSubmission.vendorName || "Unknown Vendor",
          experience: insight.extractedSubmission.experience || "",
          skills: insight.extractedSubmission.skills || [],
          noticePeriod: insight.extractedSubmission.noticePeriod || "",
          sourceEmailId: emailId,
          createdAt: new Date().toISOString(),
          confidence: insight.profile.confidence || 0.9,
          requiresReview: (insight.profile.confidence || 0.9) < 0.95
        };
        
        const candRef = await db.collection("candidatePool").add(candData);
        
        // Ownership mapping for the vendor
        await db.collection("candidateOwnership").add({
          candidateId: candRef.id,
          vendorName: candData.vendorName,
          source: "mailos",
          createdAt: new Date().toISOString(),
        });

        // Submission linkage
        const subRef = await db.collection("submissions").add({
          candidateId: candRef.id,
          status: "pending_review",
          source: "mailos",
          vendorName: candData.vendorName,
          createdAt: new Date().toISOString()
        });

        await db.collection("system_events").add({
          type: "lifecycle_automation",
          message: `Automated Vendor Submission: ${insight.extractedSubmission.candidateName}`,
          timestamp: new Date().toISOString(),
          data: { event: "SubmissionCreated", candidateId: candRef.id, submissionId: subRef.id },
          // AgentRuntime integration
          event: "candidate.created",
          status: "pending",
          payload: { candidateId: candRef.id, submissionId: subRef.id }
        });
      }

      if (emailId) {
        await db.collection("emails").doc(emailId).update({
          isAiAnalyzed: true,
          aiAnalysis: insight,
          entityType: insight.profile.intent,
        });
      }
    }

    return res.status(200).json(insight);
  } catch (error: any) {
    console.error("Brain execution failed:", error);
    return res.status(500).json({ error: error.message });
  }
})();
    case 'copilot':
      return await (async () => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { context, emailId, action } = req.body;

  if (!context || !action) {
    return res
      .status(400)
      .json({ error: "Missing required parameters (context, action)" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
    const aiClient = new GoogleGenAI({ apiKey });

    const systemPrompt = `
    Act as the HireNestOS MailOS Copilot, an AI-native staffing communication engine.
    You are generating a highly contextual response based on the staffing lifecycle.
    
    Requested Action: ${action}
    
    Provided Context:
    ${JSON.stringify(context, null, 2)}
    
    INSTRUCTIONS BASED ON ACTION:
    - Generate Client Acknowledgement: Acknowledge requirement, state sourcing has begun through internal network and vendor ecosystem. Ask for missing details safely.
    - Generate Vendor Broadcast: Share the requirement details suitable for vendors (do not include client name unless explicitly instructed otherwise or if standard practice, typically C2C, budget structure, etc.).
    - Submission Mail / Generate Submission Email: Short, crisp cover letter detailing candidate fitment.
    - Interview Coordination: Propose slots, confirm details, include attachments context if needed.
    - Send Confirmation: Confirm interview or offer details.
    - Generate Candidate Instructions: Clear preparation steps and instructions for an interview.
    - Find Matching Candidates: Summarize availability of candidates for the role based on context.
    - Reject Candidate: Polite rejection, mention we will retain profile for future roles.
    - Schedule Screening: Request candidate availability for a quick initial screening.
    - Review Candidate: Provide a quick analysis on candidate's match with the role based on email.
    - Offer Follow-up / Generate Candidate Follow-up: Congratulate the candidate, set expectations for joining, confirm documentation.
    - Collection Reminder: Polite but firm follow-up on overdue invoices. Include standard professional sign-offs.
    - Client Engagement: Routine check-in or relationship building. Keep it warm and consultative.
    
    Output exactly the drafted email body text. Do not include headers like "Subject:" unless necessary. Do not encapsulate in markdown code blocks unless it's just raw text. Keep formatting professional with appropriate line breaks.
    `;

    const result = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
    });

    const draft = result.text || "";

    // Log the generation
    if (db) {
      await db.collection("email_copilot_logs").add({
        emailId: emailId || null,
        promptType: action,
        generatedBy: "user",
        createdAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({ draft });
  } catch (error: any) {
    console.error(
      '[COPILOT ERROR]',
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );
    return res.status(500).json({ 
      message: error.message,
      stack: error.stack,
      raw: error
    });
  }
})();
    case 'audit':
      return await (async () => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!db) {
       return res.status(500).json({ error: 'Database not initialized' });
    }
    const snapshot = await db.collection('classification_audit').orderBy('createdAt', 'desc').limit(100).get();
    const audits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(audits);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
})();
    default:
      return res.status(400).json({ error: "Invalid action: " + action });
  }
}
