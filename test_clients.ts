import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
  const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
  const db = getFirestore(app, config.firestoreDatabaseId);
  
  // requirements
  const reqsSnap = await db.collection('requirements').get();
  const reqsClientsMap = new Map<string, any>();
  reqsSnap.docs.forEach(d => {
    const data = d.data();
    const clientId = data.clientId || data.client_id;
    if (clientId && !reqsClientsMap.has(clientId)) {
      reqsClientsMap.set(clientId, { id: clientId });
    }
  });

  // clients
  const snap = await db.collection('clients').get();
  let firebaseClients = snap.docs.map(d => ({ id: d.id }));

  const extractedClients = Array.from(reqsClientsMap.values());
  const existingIds = new Set(firebaseClients.map(c => c.id));
  const newExtracted = extractedClients.filter(c => !existingIds.has(c.id));
  
  console.log('firebaseClients start:', firebaseClients.map(c => c.id));
  console.log('newExtracted:', newExtracted.map(c => c.id));
  
  firebaseClients = [...firebaseClients, ...newExtracted];
  console.log('firebaseClients middle:', firebaseClients.map(c => c.id));

  const pubReqsSnap = await db.collection('requirements_public').get();
  const pubClientsMap = new Map<string, any>();
  pubReqsSnap.docs.forEach(d => {
    const data = d.data();
    const clientId = data.clientId || data.client_id;
    if (clientId && !pubClientsMap.has(clientId)) {
      pubClientsMap.set(clientId, { id: clientId });
    }
  });

  const extractedPubClients = Array.from(pubClientsMap.values());
  const finalExistingIds = new Set(firebaseClients.map(c => c.id));
  const newPubExtracted = extractedPubClients.filter(c => !finalExistingIds.has(c.id));
  
  console.log('newPubExtracted:', newPubExtracted.map(c => c.id));

  const finalClients = [...newPubExtracted, ...firebaseClients];
  console.log('finalClients:', finalClients.map(c => c.id));
  
  const ids = finalClients.map(c => c.id);
  const dupes = ids.filter((item, index) => ids.indexOf(item) !== index);
  console.log('Total:', finalClients.length, 'Duplicates:', dupes);
}
run().catch(console.error);
