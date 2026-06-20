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

export { db, adminApp };
