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
}
