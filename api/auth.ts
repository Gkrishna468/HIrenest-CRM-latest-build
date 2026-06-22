import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import * as crypto from "crypto";
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

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-insecure-key-32-chars!!!";
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
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action || (req.body && req.body.action);
  switch (action) {
    case 'url':
      return await (async () => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth?action=callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: (req.query.userId as string) || 'unknown'
    });

    return res.status(200).json({ url });
  } catch (error: any) {
    console.error('[Gmail Auth URL Error]', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
})();
    case 'callback':
      return await (async () => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const code = req.query.code as string;
  const userId = req.query.state as string;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  const logToFirestore = async (step: string, details?: any) => {
    console.log(`[OAuth Debug] ${step}`, details || '');
    if (db) {
      try {
        await db.collection('oauth_debug').add({
          step,
          timestamp: new Date().toISOString(),
          details: details || null
        });
      } catch (err) {
        console.error('Failed to log to oauth_debug', err);
      }
    }
  };

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth?action=callback`
    );

    await logToFirestore("STEP_1_TOKEN_EXCHANGE_START");
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    await logToFirestore("STEP_1_TOKEN_EXCHANGE_SUCCESS");

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress;

    if (!emailAddress) throw new Error("Could not get email address");

    // Look up any existing connection for this user or email to find refresh token fallback
    let existingConnectionData: any = null;
    let connRef: any = null;

    if (!db) {
      throw new Error("Firestore db is not initialized. Cannot save Gmail connection.");
    }

    if (userId && userId !== 'unknown') {
      const snapshot = await db.collection('gmail_connections')
        .where('userId', '==', userId)
        .limit(1).get();
      if (!snapshot.empty) {
        connRef = snapshot.docs[0].ref;
        existingConnectionData = snapshot.docs[0].data();
      }
    }

    if (!connRef && emailAddress) {
      const snapshot = await db.collection('gmail_connections')
        .where('email', '==', emailAddress)
        .limit(1).get();
      if (!snapshot.empty) {
        connRef = snapshot.docs[0].ref;
        existingConnectionData = snapshot.docs[0].data();
      }
    }

    let encryptedRefreshToken = '';
    if (tokens.refresh_token) {
      encryptedRefreshToken = encrypt(tokens.refresh_token);
    } else if (existingConnectionData && existingConnectionData.encryptedRefreshToken) {
      encryptedRefreshToken = existingConnectionData.encryptedRefreshToken;
    }

    let historyId = profile.data.historyId || existingConnectionData?.historyId || '';

    await logToFirestore("STEP_2_FIRESTORE_WRITE_START", {
      hasNewRefreshToken: !!tokens.refresh_token,
      hasExistingTokenFallback: !!(existingConnectionData && existingConnectionData.encryptedRefreshToken),
    });

    if (!connRef) {
      // Use userId as doc ID to guarantee unique connection record per user
      if (userId && userId !== 'unknown') {
        connRef = db.collection('gmail_connections').doc(userId);
      } else {
        connRef = db.collection('gmail_connections').doc();
      }
    }

    const connRefId = connRef.id;
    await connRef.set({
      userId: userId || 'unknown',
      email: emailAddress,
      status: 'active',
      historyId: historyId,
      encryptedRefreshToken: encryptedRefreshToken,
      watchExpiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), 
      createdAt: existingConnectionData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Emit GMAIL_CONNECTED event
    await db.collection('system_events').add({
      eventType: 'GMAIL_CONNECTED',
      entityCollection: 'gmail_connections',
      entityId: connRefId,
      metadata: { email: emailAddress, isUpdate: !!existingConnectionData },
      createdAt: new Date().toISOString()
    });
    await logToFirestore("STEP_2_FIRESTORE_WRITE_SUCCESS", { connectionId: connRefId });

    // Try Watch API but don't fail the whole connection if it fails
    if (process.env.PUBSUB_TOPIC_NAME) {
      await logToFirestore("STEP_3_WATCH_API_START");
      try {
        const watchRes = await gmail.users.watch({
          userId: 'me',
          requestBody: {
            labelIds: ['INBOX'],
            topicName: process.env.PUBSUB_TOPIC_NAME
          }
        });
        historyId = watchRes.data.historyId || historyId;
        console.log(`[Gmail Auth] Watch registration successful for ${emailAddress}`);
        
        await db.collection('gmail_connections').doc(connRefId).update({
          historyId: historyId
        });
        await logToFirestore("STEP_3_WATCH_API_SUCCESS");
      } catch (watchError: any) {
        console.error('[Gmail Auth Watch Error]', watchError);
        await logToFirestore("STEP_3_WATCH_API_FAILED", { error: watchError.message });
      }
    } else {
      await logToFirestore("STEP_3_WATCH_API_SKIPPED_NO_TOPIC");
    }

    res.redirect('/settings?gmail_connected=true');
  } catch (error: any) {
    console.error('[Gmail Auth Callback Error]', error);
    await logToFirestore("STEP_FAILED", { error: error.message });
    res.redirect('/settings?gmail_error=failed_to_connect');
  }
})();
    default:
      return res.status(400).json({ error: "Invalid action: " + action });
  }
}
