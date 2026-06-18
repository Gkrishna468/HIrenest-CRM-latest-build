import { google } from 'googleapis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
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

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-insecure-key-32-chars!!!';
const IV_LENGTH = 16;
export const decrypt = (text: string): string => {
  const textParts = text.split(':');
  const ivStr = textParts.shift();
  if (!ivStr) return text;
  const iv = Buffer.from(ivStr, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const emailAddress = req.query.email as string;
  if (!emailAddress) {
    return res.status(400).json({ error: 'Missing email query parameter' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Firestore not initialized' });
  }

  try {
    const connectionSnapshot = await db.collection('gmail_connections').where('email', '==', emailAddress).limit(1).get();
    if (connectionSnapshot.empty) {
      return res.status(404).json({ error: 'No connection found for this email' });
    }

    const connectionData = connectionSnapshot.docs[0].data();
    
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
        userEmail: emailAddress,
        from,
        subject,
        snippet: messageRes.data.snippet || '',
        body: body.substring(0, 5000), // store up to 5k chars initially
        receivedAt: date,
        threadId: msg.threadId,
        createdAt: new Date().toISOString()
      });
      syncedCount++;
    }

    return res.status(200).json({ success: true, syncedCount, message: `Synced ${syncedCount} new emails` });
  } catch (error: any) {
    console.error('[Gmail Sync Error]', error);
    return res.status(500).json({ error: error.message });
  }
}
