import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  const adminApp = initializeApp({
    credential: applicationDefault(),
    projectId: firebaseConfig.projectId,
  });

  const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

  const snap = await db.collection('accounts').get();
  console.log(`accounts size: ${snap.size}`);
}
run();
