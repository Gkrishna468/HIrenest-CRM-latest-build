import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

let db: Firestore | null = null;
let adminApp: any = null;

if (!(getApps()?.length)) {
  try {
    adminApp = initializeApp({
      credential: applicationDefault()
    });
    db = getFirestore(adminApp);
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
} else {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const app = getApps()[0];
  db = getFirestore();
}

export { db };
