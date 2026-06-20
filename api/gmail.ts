import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import * as crypto from "crypto";
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
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
const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default-insecure-key-32-chars!!!";
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
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action || (req.body && req.body.action);
  switch (action) {
    case 'sync':
      return await (async () => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const emailAddress = req.query.email as string;
  const userId = req.query.userId as string;

  if (!emailAddress && !userId) {
    return res.status(400).json({ error: 'Missing email or userId parameter' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Firestore not initialized' });
  }

  try {
    let connectionSnapshot;
    
    if (userId) {
      connectionSnapshot = await db.collection('gmail_connections').where('userId', '==', userId).limit(1).get();
    } else {
      // Fallback for older integration
      connectionSnapshot = await db.collection('gmail_connections').where('email', '==', emailAddress).limit(1).get();
    }

    if (connectionSnapshot.empty) {
      return res.status(404).json({ error: 'No connection found for this user' });
    }

    const connectionData = connectionSnapshot.docs[0].data();
    const resolvedEmail = connectionData.email; // Use the actual connected email for syncing

    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    const refreshToken = decrypt(connectionData.encryptedRefreshToken);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // refresh tokens if needed
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Fetch last 15 messages from Inbox
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
      maxResults: 15
    });

    const messages = listRes.data.messages || [];
    let syncedCount = 0;

    for (const msg of messages) {
      if (!msg.id) continue;
      
      // Check if we already have it
      const existing = await db.collection('emails').doc(msg.id).get();
      if (existing.exists) continue;

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

      // Basic regex classifier to filter out noise
      const lowerFrom = from.toLowerCase();
      const lowerSub = subject.toLowerCase();
      let classification = "Requirement"; // Default assumption for unanalyzed

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
      } else if (lowerSub.includes("submission") || lowerSub.includes("profile") || lowerSub.includes("resume")) {
        classification = "Vendor Submission";
      } else if (lowerSub.includes("interview") || lowerSub.includes("schedule")) {
        classification = "Interview";
      } else if (lowerSub.includes("invoice") || lowerSub.includes("payment")) {
        classification = "Invoice";
      }

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
        entityType: classification,
        mail_classification: classification
      });
      syncedCount++;
    }

    return res.status(200).json({ success: true, syncedCount, message: `Synced ${syncedCount} new emails` });
  } catch (error: any) {
    console.error('[Gmail Sync Error]', error);
    return res.status(500).json({ error: error.message });
  }
})();
    case 'list':
      return await (async () => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const emailAddress = req.query.email as string;
  const userId = req.query.userId as string;

  console.log('EMAIL:', emailAddress);
  console.log('USER ID:', userId);

  if (!db) {
    return res.status(500).json({ error: 'Firestore not initialized' });
  }

  let resolvedEmail = emailAddress;

  try {
    if (userId) {
      console.log('Searching gmail_connections');
      const connectionSnapshot = await db.collection('gmail_connections').where('userId', '==', userId).limit(1).get();
      console.log('Found:', connectionSnapshot.size);
      if (!connectionSnapshot.empty) {
        resolvedEmail = connectionSnapshot.docs[0].data().email;
        console.log('Resolved Email:', resolvedEmail);
      }
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
})();
    case 'send':
      return await (async () => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, to, subject, body, threadId, messageId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Firestore not initialized' });
  }

  try {
    console.log('Sending email for user:', userId);
    const connectionSnapshot = await db.collection('gmail_connections').where('userId', '==', userId).limit(1).get();

    if (connectionSnapshot.empty) {
      return res.status(404).json({ error: 'No connection found for this user' });
    }

    const connectionData = connectionSnapshot.docs[0].data();
    
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
})();
    default:
      return res.status(400).json({ error: "Invalid action: " + action });
  }
}
