import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../lib/firebaseAdmin.js';

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
