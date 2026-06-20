import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import {
  initializeApp,
  getApps,
  applicationDefault,
  cert,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
dotenv.config();

let db: Firestore | null = null;
let adminApp: any = null;

if (!getApps()?.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
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
    db = getFirestore(adminApp);
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
} else {
  db = getFirestore();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { context, emailId, mode, action } = req.body;

  if (!context || !mode || !action) {
    return res
      .status(400)
      .json({ error: "Missing required parameters (context, mode, action)" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
    const aiClient = new GoogleGenAI({ apiKey });

    const systemPrompt = `
    Act as the HireNestOS MailOS Copilot, an AI-native staffing communication engine.
    You are generating a highly contextual response based on the staffing lifecycle.
    
    Current Copilot Mode: ${mode}
    Requested Action: ${action}
    
    Provided Context:
    ${JSON.stringify(context, null, 2)}
    
    INSTRUCTIONS BASED ON MODE:
    - Founder Mode: Professional, strategic, relationship building, revenue focused.
    - Vendor Manager Mode: Clear, instructional, sharing requirements or feedback with partners. Example: "We have an urgent requirement..."
    - Recruiter Mode: Action-oriented, submission generation, follow-up, interview coordination.
    - Finance Mode: Polite but firm, collection reminders, invoice follow-ups.
    
    INSTRUCTIONS BASED ON ACTION:
    - Generate Client Reply (Requirement Reply): Acknowledge requirement, state sourcing has begun through internal network and vendor ecosystem. Ask for missing details safely.
    - Generate Vendor Broadcast: Share the requirement details suitable for vendors (do not include client name unless explicitly instructed otherwise or if standard practice, typically C2C, budget structure, etc.).
    - Submission Mail: Short, crisp cover letter detailing candidate fitment.
    - Interview Coordination: Propose slots, confirm details, include attachments context if needed.
    - Offer Follow-up: Congratulate the candidate, set expectations for joining, confirm documentation.
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
        mode: mode,
        generatedBy: "user",
        createdAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({ draft });
  } catch (error: any) {
    console.error("Copilot execution failed:", error);
    return res.status(500).json({ error: error.message });
  }
}
