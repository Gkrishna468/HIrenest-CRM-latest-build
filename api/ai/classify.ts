import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

let db: Firestore | null = null;
let adminApp: any = null;

if (!(getApps()?.length)) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey })
      });
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId
      });
    }
    db = getFirestore(adminApp);
  } catch (error) {
    console.error('Firebase initialization error', error);
  }
} else {
  db = getFirestore();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, context, emailId } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
    const aiClient = new GoogleGenAI({ apiKey });

    const prompt = `
    Act as the "Unified Intelligence Brain" for HireNest Enterprise CRM.
    Analyze the following interaction (Email, text, JD, or WhatsApp) and generate a strategy.
    
    If the text resembles an email with a job requirement, focus tightly on extracting the requirement.
    If the text resembles a submission from a vendor, focus on extracting the candidate details.
    If the text resembles an interview schedule or request, focus on extracting the interview details.

    INTERACTION TEXT:
    "${text}"

    CONTEXT:
    ${JSON.stringify(context || {})}

    TASKS:
    1. PROFILE: Determine if they want to hire (requirement), apply for a job (submission), schedule/discuss an interview (interview), partner as a vendor, or other. Extract roles/skills.
    2. PITCH: Generate a short, conversion-focused pitch (email/WhatsApp style) in response.
    3. FOLLOW-UP: Decide if we should follow up and when.
    4. EXTRACTION: 
       - If "requirement", extract properties: { title, location, experience, employmentType, status }. 
       - If "submission", extract: { candidateName, experience, skills }.
       - If "interview", extract: { client, candidates, interviewType, date, status }.

    RETURN ONLY VALID JSON MATCHING THIS EXACT SCHEMA:
    {
      "profile": {
        "intent": "requirement" | "submission" | "vendor" | "interview" | "other",
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
        "title": "string",
        "location": "string",
        "experience": "string",
        "employmentType": "C2C | C2H | FTE",
        "status": "Open"
      },
      "extractedSubmission": {
        "candidateName": "string",
        "experience": "string",
        "skills": ["skill 1"]
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
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const cleanText = (result.text || '').replace(/```json|```/g, "").trim();
    const insight = JSON.parse(cleanText);

    // Auto-log to Firestore
    if (db) {
       await db.collection('system_events').add({
         type: 'brain_process',
         message: `AI Brain processed interaction: ${insight.profile.intent}`,
         timestamp: new Date().toISOString(),
         data: { emailId: emailId || null, intent: insight.profile.intent }
       });
       
       // Update email with AI Analysis
       if (emailId) {
          await db.collection('emails').doc(emailId).update({
             isAiAnalyzed: true,
             aiAnalysis: insight,
             entityType: insight.profile.intent
          });
          
          if (insight.profile.intent === 'requirement' && insight.extractedRequirement?.title) {
              await db.collection('requirements').add({
                 ...insight.extractedRequirement,
                 sourceEmailId: emailId,
                 sourceContext: context,
                 createdAt: new Date().toISOString()
              });
          }
          
          if (insight.profile.intent === 'submission' && insight.extractedSubmission?.candidateName) {
              await db.collection('submissions').add({
                 ...insight.extractedSubmission,
                 sourceEmailId: emailId,
                 sourceContext: context,
                 createdAt: new Date().toISOString()
              });
          }

          if (insight.profile.intent === 'interview' && insight.extractedInterview?.client) {
              await db.collection('interviews').add({
                 ...insight.extractedInterview,
                 sourceEmailId: emailId,
                 sourceContext: context,
                 createdAt: new Date().toISOString()
              });
          }
       }
    }

    return res.status(200).json(insight);
  } catch (error: any) {
    console.error("Brain execution failed:", error);
    return res.status(500).json({ error: error.message });
  }
}
