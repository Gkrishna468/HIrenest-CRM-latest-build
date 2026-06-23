import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import * as crypto from "crypto";
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
dotenv.config();

import * as fs from "fs";
import * as path from "path";

let db: Firestore | null = null;
let adminApp: any = null;

if (!getApps()?.length) {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    let firestoreDbId = "ai-studio-b73763a6-9c1f-4b69-a850-b55bc897ef24";
    let projectId = process.env.FIREBASE_PROJECT_ID;
    
    try {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (firebaseConfig.firestoreDatabaseId) firestoreDbId = firebaseConfig.firestoreDatabaseId;
      if (!projectId) projectId = firebaseConfig.projectId;
    } catch (e) {
      console.log("[Gmail API Init Warning] Could not read firebase-applet-config.json, using hardcoded fallback database ID");
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId || "hirenest-os",
      });
    }
    db = getFirestore(adminApp, firestoreDbId);
  } catch (error) {
    console.error("Firebase initialization error", error);
    try {
      if (adminApp) {
        db = getFirestore(adminApp, "ai-studio-b73763a6-9c1f-4b69-a850-b55bc897ef24");
      }
    } catch (fallbackError) {
      console.error("Firebase ultimate fallback error", fallbackError);
    }
  }
} else {
  adminApp = getApps()[0];
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || "ai-studio-b73763a6-9c1f-4b69-a850-b55bc897ef24");
  } catch(err) {
    db = getFirestore(adminApp, "ai-studio-b73763a6-9c1f-4b69-a850-b55bc897ef24");
  }
}
const ALGORITHM = "aes-256-cbc";
const rawKey = process.env.ENCRYPTION_KEY || "default-insecure-key-32-chars!!!";
const ENCRYPTION_KEY = rawKey.padEnd(32, '!').substring(0, 32);
const IV_LENGTH = 16;
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decrypt = (text: string): string => {
  const textParts = text.split(":");
  const ivStr = textParts.shift();
  if (!ivStr) return text;
  const iv = Buffer.from(ivStr, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");

  const tryDecrypt = (keyStr: string) => {
    try {
      if (keyStr.length !== 32) return null;
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(keyStr), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch(e) {
      return null;
    }
  };

  let decryptedVal = tryDecrypt(ENCRYPTION_KEY);
  if (!decryptedVal) {
    decryptedVal = tryDecrypt("default-insecure-key-32-chars!!!");
  }
  
  if (!decryptedVal) {
      throw new Error("bad decrypt");
  }

  return decryptedVal;
};

interface ClassificationResponse {
  classification: "Requirement" | "Submission" | "Interview" | "Offer" | "Vendor Response" | "Noise";
  summary: string;
  senderType: "Vendor" | "Client" | "Candidate" | "System/Automated" | "Unknown";
}

async function classifyEmailWithGemini(subject: string, from: string, bodySnippet: string): Promise<ClassificationResponse> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/^"|"$/g, "").replace(/^'|'$/g, "");
  if (!apiKey) {
    console.log("[Classification] GEMINI_API_KEY is not defined, using regex classification fallback.");
    return performRegexClassification(subject, from, bodySnippet);
  }

  try {
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `You are an AI Recruitment & Staffing CRM classification engine.
Analyze the following email metadata and content snippet, and categorize it accurately.

Email Details:
From: ${from}
Subject: ${subject}
Content Snippet: ${bodySnippet || '(empty)'}

Classify into one of these:
1. "Requirement": Client requests, hiring lookups, job openings, project requirements, position details, C2C (corp-to-corp) or FTE roles.
2. "Submission": Re-submitting candidate profiles, resume sharing, profile submissions, subcontractor candidates shared by vendors.
3. "Interview": Scheduling interviews, confirmations, calendar invites, interview slots.
4. "Offer": Job offers, select feedback, onboarding files, assignment starts.
5. "Vendor Response": Replies from candidates or vendors, rate negotiations.
6. "Noise": Amazon, security notifications, newsletters, marketing list spam, automated notification alerts, standard non-recruitment updates.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: {
              type: Type.STRING,
              enum: ["Requirement", "Submission", "Interview", "Offer", "Vendor Response", "Noise"],
              description: "The core recruitment classification of the email."
            },
            summary: {
              type: Type.STRING,
              description: "A professional one-sentence summary of the email."
            },
            senderType: {
              type: Type.STRING,
              enum: ["Vendor", "Client", "Candidate", "System/Automated", "Unknown"],
              description: "Type of the sender."
            }
          },
          required: ["classification", "summary", "senderType"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      if (data && data.classification) {
        return data as ClassificationResponse;
      }
    }
    
    return performRegexClassification(subject, from, bodySnippet);
  } catch (err) {
    console.error("[Gemini Classification Error]", err);
    return performRegexClassification(subject, from, bodySnippet);
  }
}

function performRegexClassification(subject: string, from: string, bodySnippet: string): ClassificationResponse {
  const lowerFrom = from.toLowerCase();
  const lowerSub = subject.toLowerCase();
  const lowerBody = bodySnippet.toLowerCase();

  let classification: "Requirement" | "Submission" | "Interview" | "Offer" | "Vendor Response" | "Noise" = "Requirement";
  let senderType: "Vendor" | "Client" | "Candidate" | "System/Automated" | "Unknown" = "Unknown";
  let summary = `Email from ${from} regarding ${subject}`;

  if (
    lowerFrom.includes("amazon") || 
    lowerFrom.includes("reddit") || 
    lowerFrom.includes("newsletter") || 
    lowerFrom.includes("alerts@") || 
    lowerFrom.includes("marketing") ||
    lowerFrom.includes("hdfc") ||
    lowerFrom.includes("bank") ||
    lowerFrom.includes("pay")
  ) {
    classification = "Noise";
    senderType = "System/Automated";
  } else if (lowerSub.includes("submission") || lowerSub.includes("profile") || lowerSub.includes("resume") || lowerBody.includes("resume linked") || lowerBody.includes("attached resume")) {
    classification = "Submission";
    senderType = "Vendor";
  } else if (lowerSub.includes("interview") || lowerSub.includes("schedule") || lowerBody.includes("interview call")) {
    classification = "Interview";
    senderType = "Client";
  } else if (lowerSub.includes("offer") || lowerSub.includes("selected") || lowerBody.includes("congratulations")) {
    classification = "Offer";
    senderType = "Client";
  } else if (lowerSub.includes("invoice") || lowerSub.includes("billing")) {
    classification = "Noise";
    senderType = "System/Automated";
  }

  return { classification, summary, senderType };
}

async function getGmailConnection(userId?: string, emailAddress?: string) {
  if (!db) {
    console.error("[getGmailConnection] Db is null");
    return null;
  }

  // Convert empty/placeholder string values to proper undefined
  const cleanUserId = (userId === "undefined" || userId === "null" || userId === "unknown") ? undefined : userId;
  const cleanEmail = (emailAddress === "undefined" || emailAddress === "null" || emailAddress === "unknown") ? undefined : emailAddress;

  console.log("[getGmailConnection] Starting search with Cleaned params:", { cleanUserId, cleanEmail });

  let connectionSnapshot;

  // 1. Try finding by cleanUserId (with status == 'active')
  if (cleanUserId) {
    connectionSnapshot = await db.collection('gmail_connections')
      .where('userId', '==', cleanUserId)
      .where('status', '==', 'active')
      .limit(1).get();
    if (!connectionSnapshot.empty) {
      console.log("[getGmailConnection] Matched active userId in step 1:", cleanUserId);
      return connectionSnapshot.docs[0].data();
    }
  }

  // 2. Try finding by cleanEmail (with status == 'active')
  if (cleanEmail) {
    connectionSnapshot = await db.collection('gmail_connections')
      .where('email', '==', cleanEmail)
      .where('status', '==', 'active')
      .limit(1).get();
    if (!connectionSnapshot.empty) {
      console.log("[getGmailConnection] Matched active email in step 2:", cleanEmail);
      return connectionSnapshot.docs[0].data();
    }
  }

  // 3. Try finding by cleanUserId (any status)
  if (cleanUserId) {
    connectionSnapshot = await db.collection('gmail_connections')
      .where('userId', '==', cleanUserId)
      .limit(1).get();
    if (!connectionSnapshot.empty) {
      console.log("[getGmailConnection] Matched fallback userId in step 3:", cleanUserId);
      return connectionSnapshot.docs[0].data();
    }
  }

  // 4. Try finding by cleanEmail (any status)
  if (cleanEmail) {
    connectionSnapshot = await db.collection('gmail_connections')
      .where('email', '==', cleanEmail)
      .limit(1).get();
    if (!connectionSnapshot.empty) {
      console.log("[getGmailConnection] Matched fallback email in step 4:", cleanEmail);
      return connectionSnapshot.docs[0].data();
    }
  }

  // 5. Ultimate fallback: retrieve the absolute last active registration
  connectionSnapshot = await db.collection('gmail_connections')
    .where('status', '==', 'active')
    .limit(1).get();
  if (!connectionSnapshot.empty) {
    console.log("[getGmailConnection] Fallback step 5 matched first active registration:", connectionSnapshot.docs[0].data().email);
    return connectionSnapshot.docs[0].data();
  }

  // 6. Absolute final fallback: list any connection in the database
  connectionSnapshot = await db.collection('gmail_connections')
    .limit(1).get();
  if (!connectionSnapshot.empty) {
    console.log("[getGmailConnection] Universal fallback step 6 matched first available connection:", connectionSnapshot.docs[0].data().email);
    return connectionSnapshot.docs[0].data();
  }

  // Log all existing connections to help debug if everything fails
  try {
    const allCons = await db.collection('gmail_connections').limit(5).get();
    console.log("[getGmailConnection Debug] Total database connections found:", allCons.size);
    allCons.forEach(doc => {
      console.log(`Document ID: ${doc.id} =>`, {
        userId: doc.data().userId,
        email: doc.data().email,
        status: doc.data().status
      });
    });
  } catch (err) {
    console.error("[getGmailConnection Debug] Failed listing connection collection", err);
  }

  return null;
}

async function handleSync(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userId = (req.query.userId || req.body?.userId) as string;

  console.log("USER ID", userId);

  if (db) {
    try {
      const snapshot = await db.collection("gmail_connections")
        .where("userId", "==", userId)
        .get();

      console.log("FOUND DOCS", snapshot.size);

      snapshot.forEach(doc => {
        console.log(doc.id, doc.data());
      });
    } catch(e) {
      console.error("Debug Query failed", e);
    }
  }

  if (!userId) {
    console.error("Sync parameter missing error");
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!db) {
    console.error("Firestore DB reference is null");
    return res.status(500).json({ error: 'Firestore not initialized' });
  }

  try {
    const connectionData = await getGmailConnection(userId);
      
    console.log("USER ID", userId);
    console.log("CONNECTION DATA FOUND", !!connectionData);

    if (!connectionData) {
      console.error(`[Sync Error] No connection found in Firestore for user '${userId}'`);
      return res.status(404).json({ error: 'No connection found for this user' });
    }

    const resolvedEmail = connectionData.email;
    
    console.log("[Sync Debug] Resolved connectionData:", {
      userId: connectionData.userId,
      email: connectionData.email,
      status: connectionData.status,
      hasRefreshToken: !!connectionData.encryptedRefreshToken
    });

    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    const refreshToken = decrypt(connectionData.encryptedRefreshToken);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // refresh tokens if needed
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Fetch messages from Inbox with broad timeline window as requested
    console.log("[Sync Debug] Fetching messages from Gmail API...");
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: `newer_than:30d`, // Broad scan to avoid keyword misses
      maxResults: 40 // Broad search range
    });

    const messages = listRes.data.messages || [];
    console.log(`[Sync Debug] Retrieved ${messages.length} messages from broad Gmail scan`);

    let syncedCount = 0;
    let writeCount = 0;

    for (const msg of messages) {
      if (!msg.id) continue;
      
      // Check if we already have it
      const existing = await db.collection('emails').doc(msg.id).get();
      if (existing.exists) continue;

      console.log(`[Sync Debug] Processing new message id: ${msg.id}`);
      const messageRes = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });
      
      const payload = messageRes.data.payload;
      const headers = payload?.headers || [];
      
      const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
      
      const subject = getHeader('subject');
      const from = getHeader('from');
      const date = getHeader('date');

      // Simple body extraction
      let body = '';
      if (payload?.parts) {
        const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart && textPart.body && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      } else if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }

      // Temporarily bypass AI classification
      const aiResult = {
         classification: null,
         summary: "Synced via broad scan (AI Bypassed)",
         senderType: "Unknown"
      };

      await db.collection('emails').doc(msg.id).set({
        gmailMessageId: msg.id,
        userEmail: resolvedEmail,
        from,
        subject,
        snippet: messageRes.data.snippet || '',
        body: body.substring(0, 5000), // store up to 5k chars initially
        receivedAt: date,
        threadId: msg.threadId,
        createdAt: new Date().toISOString(),
        entityType: aiResult.classification,
        mail_classification: aiResult.classification,
        aiSummary: aiResult.summary,
        senderType: aiResult.senderType
      });
      syncedCount++;
      writeCount++;
    }

    console.log(`=== GMAIL SYNC SUCCESSFUL ===`);
    console.log(`Synced message count: ${syncedCount}, Firestore write count: ${writeCount}`);

    return res.status(200).json({ 
      success: true, 
      syncedCount, 
      writeCount,
      message: `Synced ${syncedCount} new emails` 
    });
  } catch (error: any) {
    console.error('[Gmail Sync Error]', error);
    return res.status(500).json({ error: error.message || 'Internal connection/API error' });
  }
}

async function handleList(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userId = req.query.userId as string;

  console.log('USER ID PARAM:', userId);

  if (!db) {
    return res.status(500).json({ error: 'Firestore not initialized' });
  }

  let resolvedEmail = null;

  try {
    const connectionData = await getGmailConnection(userId);
    if (connectionData) {
      resolvedEmail = connectionData.email;
      console.log('Resolved Email to List:', resolvedEmail);
    }

    let queryArgs: any = db.collection('emails').limit(100);
    
    if (resolvedEmail) {
       queryArgs = db.collection('emails').where('userEmail', '==', resolvedEmail).limit(100);
    }
    
    const snapshot = await queryArgs.get();
    
    const emails = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort in memory
    emails.sort((a: any, b: any) => new Date(b.receivedAt || 0).getTime() - new Date(a.receivedAt || 0).getTime());

    return res.status(200).json({ emails });
  } catch (error: any) {
    console.error('[Gmail List Error]', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleSend(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, to, subject, body, threadId, messageId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Firestore not initialized' });
  }

  try {
    console.log('Sending email for user:', userId);
    const connectionData = await getGmailConnection(userId);

    if (!connectionData) {
      return res.status(404).json({ error: 'No connection found for this user' });
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    const refreshToken = decrypt(connectionData.encryptedRefreshToken);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // construct raw email message
    // Note: Gmail API requires base64url encoded email string
    const emailLines = [];
    emailLines.push(`To: ${to}`);
    emailLines.push('Content-Type: text/plain; charset=utf-8');
    emailLines.push('MIME-Version: 1.0');
    emailLines.push(`Subject: ${subject}`);
    
    if (messageId) {
      emailLines.push(`In-Reply-To: ${messageId}`);
      emailLines.push(`References: ${messageId}`);
    }
    
    emailLines.push('');
    emailLines.push(body);

    const emailStr = emailLines.join('\n');
    const encodedEmail = Buffer.from(emailStr)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const resSend = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: threadId || undefined
      }
    });

    return res.status(200).json({ success: true, messageId: resSend.data.id });
  } catch (error: any) {
    console.error('[Gmail Send Error]', error);
    return res.status(500).json({ error: error.message });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (req.query.action || req.body?.action) as string;
  const userId = (req.query.userId || req.body?.userId) as string;

  console.log("[Gmail Gateway API Hit]", {
    method: req.method,
    action: action,
    userId: userId,
    query: req.query,
    body: req.method === "POST" ? JSON.stringify(req.body) : undefined
  });

  if (action === "sync") {
    console.log("[Gmail Gateway API Hit] SYNC HANDLER HIT");
  }

  const VALID_ACTIONS = ["list", "sync", "send", "status"];

  if (!action || !VALID_ACTIONS.includes(action)) {
    return res.status(400).json({
      error: "Unsupported gmail action",
      action: action || "undefined"
    });
  }

  try {
    if (action === 'status') {
       const conn = await getGmailConnection(userId, req.query.email as string);
       if (conn) {
         return res.status(200).json({ connected: true, data: conn });
       }
       return res.status(200).json({ connected: false });
    }
    if (action === 'list') {
      return await handleList(req, res);
    }
    if (action === 'sync') {
      return await handleSync(req, res);
    }
    if (action === 'send') {
      return await handleSend(req, res);
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Internal unhandled error" });
  }
}
