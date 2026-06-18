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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const emailAddress = req.query.email as string;
  if (!db) {
    return res.status(500).json({ error: 'Firestore not initialized' });
  }

  try {
    let queryArgs: any = db.collection('emails').orderBy('receivedAt', 'desc').limit(50);
    
    if (emailAddress) {
       queryArgs = db.collection('emails').where('userEmail', '==', emailAddress).orderBy('receivedAt', 'desc').limit(50);
    }
    
    const snapshot = await queryArgs.get();
    
    const emails = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({ emails });
  } catch (error: any) {
    console.error('[Gmail List Error]', error);
    
    // Fallback if index does not exist
    try {
      let fallbackQuery: any = db.collection('emails').limit(50);
      if (emailAddress) {
         fallbackQuery = db.collection('emails').where('userEmail', '==', emailAddress).limit(50);
      }
      const snapshot = await fallbackQuery.get();
      const emails = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory
      emails.sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      
      return res.status(200).json({ emails, warning: 'Required composite index may be missing' });
    } catch (fallbackError: any) {
      return res.status(500).json({ error: fallbackError.message });
    }
  }
}
