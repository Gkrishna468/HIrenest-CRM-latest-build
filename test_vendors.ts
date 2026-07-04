import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
  const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
  const db = getFirestore(app, config.firestoreDatabaseId);

  // vendors
  const snap = await db.collection('vendors').get();
  let firebaseVendors = snap.docs.map(d => ({ id: d.id }));

  const candsSnap = await db.collection('candidates').get();
  const reqsVendorsMap = new Map<string, any>();
  candsSnap.docs.forEach(d => {
    const data = d.data();
    const vendorId = data.vendorId || data.vendor_id;
    if (vendorId && !reqsVendorsMap.has(vendorId)) {
      reqsVendorsMap.set(vendorId, { id: vendorId });
    }
  });

  const extractedVendors = Array.from(reqsVendorsMap.values());
  const existingIds = new Set(firebaseVendors.map(c => c.id));
  const newExtracted = extractedVendors.filter(c => !existingIds.has(c.id));
  firebaseVendors = [...firebaseVendors, ...newExtracted];

  const pubCandsSnap = await db.collection('candidates_public').get();
  const pubVendorsMap = new Map<string, any>();
  pubCandsSnap.docs.forEach(d => {
    const data = d.data();
    const vendorId = data.vendorId || data.vendor_id;
    if (vendorId && !pubVendorsMap.has(vendorId)) {
      pubVendorsMap.set(vendorId, { id: vendorId });
    }
  });

  const extractedPubVendors = Array.from(pubVendorsMap.values());
  const finalExistingIds = new Set(firebaseVendors.map(c => c.id));
  const newPubExtracted = extractedPubVendors.filter(c => !finalExistingIds.has(c.id));

  const finalVendors = [...newPubExtracted, ...firebaseVendors];
  
  const ids = finalVendors.map(c => c.id);
  const dupes = ids.filter((item, index) => ids.indexOf(item) !== index);
  console.log('Total:', finalVendors.length, 'Duplicates:', dupes);
}
run().catch(console.error);
