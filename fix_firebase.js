const fs = require('fs');

const replacement = `import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

let db: Firestore | null = null;
let adminApp: any = null;

if (!getApps()?.length) {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, "\\n");

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: firebaseConfig.projectId,
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
}`;

const pattern = /import { initializeApp,\s*getApps,\s*applicationDefault,\s*cert\s*} from "firebase-admin\/app";[\s\S]*?} else {\n  db = getFirestore\(\);\n}/;

const files = fs.readdirSync('./api').filter(f => f.endsWith('.ts'));
for(const file of files) {
  const path = './api/' + file;
  let content = fs.readFileSync(path, 'utf8');
  if (pattern.test(content)) {
    content = content.replace(pattern, replacement);
    fs.writeFileSync(path, content);
    console.log("Updated", path);
  }
}
