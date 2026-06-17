import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

let db: admin.firestore.Firestore;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    db = admin.firestore();
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    // Fallback for development if without credentials
    // Note: In real production, service accounts are mandatory.
  }
} else {
  db = admin.firestore();
}

export { db, admin };
