import type { VercelRequest, VercelResponse } from '@vercel/node';
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
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore Admin is not initialized', success: false });
    }
    
    const docRef = await db.collection('system_events').add({
      eventType: 'TEST_WRITE',
      source: 'vercel-test',
      timestamp: new Date().toISOString()
    });
    
    return res.status(200).json({
      success: true,
      id: docRef.id,
      collection: 'system_events',
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } catch (error: any) {
    console.error('[Firebase Test Write Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
