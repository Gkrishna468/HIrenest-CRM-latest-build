import { collection, doc, setDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './error';

export interface SystemEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export const eventService = {
  logEvent: async (event: Omit<SystemEvent, 'id' | 'actorId' | 'timestamp'>) => {
    try {
      const id = crypto.randomUUID();
      const eventDoc: SystemEvent = {
        ...event,
        id,
        actorId: auth.currentUser?.uid || 'system',
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'system_events', id), eventDoc);
      return eventDoc;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'system_events');
    }
  },

  getEventsByEntity: async (entityType: string, entityId: string) => {
    try {
      const q = query(
        collection(db, 'system_events'),
        where('entityType', '==', entityType),
        where('entityId', '==', entityId)
      );
      // orderBy requires a composite index typically, so we just filter in client if needed
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as SystemEvent)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'system_events');
      return [];
    }
  }
};
