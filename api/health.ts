import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./firebase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action || (req.body && req.body.action);
  switch (action) {
    case 'ai':
      return await (async () => {
  return res.json({
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    googleConfigured: !!process.env.GOOGLE_API_KEY
  });
})();
    case 'env':
      return await (async () => {
  res.status(200).json({
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    gmailClientId: !!process.env.GMAIL_CLIENT_ID,
    gmailSecret: !!process.env.GMAIL_CLIENT_SECRET
  });
})();
    case 'firebase':
      return await (async () => {
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
})();
    default:
      return res.status(400).json({ error: "Invalid action: " + action });
  }
}
