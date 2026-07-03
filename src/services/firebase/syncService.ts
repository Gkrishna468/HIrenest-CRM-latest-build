import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './config';
import { eventService } from './eventService';

export const syncService = {
  // Appends to immutable Company Ledger
  logEvent: async (eventType: string, entityType: string, entityId: string, metadata?: any) => {
    try {
      await eventService.logEvent({
        eventType,
        entityType,
        entityId,
        metadata: {
          ...metadata,
          userId: auth.currentUser?.uid || 'system',
          userEmail: auth.currentUser?.email || 'system@hirenest.com'
        }
      });
      console.log(`[Ledger] Logged ${eventType} for ${entityType} ${entityId}`);
    } catch (err) {
      console.error('[Ledger] Failed to append to Company Ledger:', err);
    }
  },

  // Dual-write Client
  syncClient: async (id: string, data: any) => {
    try {
      // 1. Write to Firebase Firestore (CRM Domain - crm_accounts)
      const crmAccountRef = doc(db, 'crm_accounts', id);
      await setDoc(crmAccountRef, {
        ...data,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Log event
      await syncService.logEvent('CLIENT_CREATED_OR_UPDATED', 'client', id, { company: data.company });
    } catch (err) {
      console.error('[Sync] Client sync failed:', err);
    }
  },

  // Dual-write Vendor
  syncVendor: async (id: string, data: any) => {
    try {
      // 1. Write to Firebase Firestore (CRM Domain - crm_vendor_accounts)
      const crmVendorRef = doc(db, 'crm_vendor_accounts', id);
      await setDoc(crmVendorRef, {
        ...data,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Log event
      await syncService.logEvent('VENDOR_CREATED_OR_UPDATED', 'vendor', id, { name: data.name, company: data.company });
    } catch (err) {
      console.error('[Sync] Vendor sync failed:', err);
    }
  },

  // Dual-write Requirement
  syncRequirement: async (id: string, data: any) => {
    try {
      // 1. Write to Firebase Firestore (OS Domain - requirements)
      const reqRef = doc(db, 'requirements', id);
      await setDoc(reqRef, {
        ...data,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Log event
      await syncService.logEvent('REQUIREMENT_SYNCED', 'requirement', id, { 
        title: data.title, 
        status: data.status,
        approvalStatus: data.approvalStatus
      });
    } catch (err) {
      console.error('[Sync] Requirement sync failed:', err);
    }
  },

  // Dual-write Candidate
  syncCandidate: async (id: string, data: any) => {
    try {
      // 1. Write to Firebase Firestore (OS Domain - candidates)
      const candRef = doc(db, 'candidates', id);
      await setDoc(candRef, {
        ...data,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Log event
      await syncService.logEvent('CANDIDATE_SYNCED', 'candidate', id, { 
        name: data.name, 
        stage: data.stage,
        status: data.status
      });
    } catch (err) {
      console.error('[Sync] Candidate sync failed:', err);
    }
  }
};
