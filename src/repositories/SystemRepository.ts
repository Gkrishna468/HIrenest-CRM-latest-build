import { collection, query, orderBy, limit, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { syncOrchestrator } from '@/services/firebase/syncOrchestrator';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';
import { safeISOString } from '@/utils/safe';

export interface SystemEvent {
  id: string;
  type: string;
  performedBy: string;
  timestamp: string;
  metadata?: any;
}

export const SystemRepository = {
  // Law 1: Company Ledger is append-only, immutable, timestamped, and auditable
  async logEvent(type: string, performedBy: string, metadata?: any): Promise<SystemEvent> {
    const id = crypto.randomUUID();
    const event: SystemEvent = {
      id,
      type,
      performedBy,
      timestamp: new Date().toISOString(),
      metadata: metadata || null,
    };
    
    try {
      // Publish via syncOrchestrator to enforce unified event bus pipelines
      await syncOrchestrator.publishEvent(type, {
        ...metadata,
        performedBy
      }, id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `system_events/${id}`);
    }

    return event;
  },

  subscribeToSystemEvents(callback: (events: SystemEvent[]) => void, onError?: (err: any) => void) {
    const q = query(
      collection(db, 'system_events'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    return onSnapshot(
      q,
      (snap) => {
        const events: SystemEvent[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          events.push({
            id: doc.id,
            type: data.type || '',
            performedBy: data.performedBy || '',
            timestamp: safeISOString(data.timestamp),
            metadata: data.metadata || null,
          } as SystemEvent);
        });
        callback(events);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'system_events');
        if (onError) onError(error);
      }
    );
  },

  subscribeToCollectionSize(collectionName: string, callback: (size: number) => void, onError?: (err: any) => void) {
    return onSnapshot(
      collection(db, collectionName),
      (snap) => {
        callback(snap.size);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
        if (onError) onError(error);
      }
    );
  },

  async listSystemEvents(): Promise<SystemEvent[]> {
    try {
      const snap = await getDocs(collection(db, 'system_events'));
      const events = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || '',
          performedBy: data.performedBy || '',
          timestamp: safeISOString(data.timestamp),
          metadata: data.metadata || null,
        } as SystemEvent;
      });
      return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'system_events');
      return [];
    }
  }
};
