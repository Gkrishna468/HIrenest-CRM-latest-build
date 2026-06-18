import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/firebaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore Admin is not initialized', firebase: false });
    }
    
    // Just a simple read to verify connection
    const healthDoc = await db.collection('system_health').doc('firebase_ping').get();
    
    return res.status(200).json({
      firebase: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
      healthDocExists: healthDoc.exists
    });
  } catch (error: any) {
    console.error('[Firebase Health Check Error]', error);
    return res.status(500).json({
      firebase: false,
      error: error.message
    });
  }
}
