import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './error';
import { eventService } from './eventService';

export interface Vendor {
  id: string;
  companyName: string;
  tier: string;
  responseRate: number;
  performanceScore: number;
}

export const vendorService = {
  createVendor: async (data: Omit<Vendor, 'id'>) => {
    try {
      const id = crypto.randomUUID();
      const vendor: Vendor = { ...data, id };
      await setDoc(doc(db, 'vendors', id), vendor);
      
      await eventService.logEvent({
        eventType: 'VENDOR_ONBOARDED',
        entityType: 'vendor',
        entityId: id,
        metadata: { companyName: data.companyName }
      });
      return vendor;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vendors');
    }
  },

  getVendors: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'vendors'));
      return snapshot.docs.map(doc => doc.data() as Vendor);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
      return [];
    }
  }
};
