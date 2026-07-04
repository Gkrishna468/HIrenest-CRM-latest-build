import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
  const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
  const db = getFirestore(app, config.firestoreDatabaseId);

  const snap = await db.collection('requirements').get();
  let firebaseJobs = snap.docs.map(d => ({ id: d.id }));

  const publicSnap = await db.collection('requirements_public').get();
  const publicJobs = publicSnap.docs.map(d => ({ id: d.id }));

  const existingIds = new Set(firebaseJobs.map(j => j.id));
  const newPublicJobs = publicJobs.filter(j => !existingIds.has(j.id));
  const finalJobs = [...newPublicJobs, ...firebaseJobs];

  const ids = finalJobs.map(c => c.id);
  const dupes = ids.filter((item, index) => ids.indexOf(item) !== index);
  console.log('Total:', finalJobs.length, 'Duplicates:', dupes);
}
run().catch(console.error);
