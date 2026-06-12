import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './error';
import { eventService } from './eventService';

export interface Communication {
  id: string;
  entityId: string;
  entityType: 'client' | 'vendor' | 'contact';
  channel: 'email' | 'whatsapp' | 'call' | 'meeting';
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
}

export const communicationService = {
  logCommunication: async (data: Omit<Communication, 'id' | 'timestamp'>) => {
    try {
      const id = crypto.randomUUID();
      const communication: Communication = {
        ...data,
        id,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'communications', id), communication);
      
      await eventService.logEvent({
        eventType: 'COMMUNICATION_LOGGED',
        entityType: 'communication',
        entityId: id,
        metadata: { channel: data.channel, direction: data.direction, target: data.entityId }
      });
      return communication;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'communications');
    }
  },

  getCommunications: async (entityId?: string) => {
    try {
      if (entityId) {
        const q = query(collection(db, 'communications'), where('entityId', '==', entityId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Communication);
      }
      const snapshot = await getDocs(collection(db, 'communications'));
      return snapshot.docs.map(doc => doc.data() as Communication);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'communications');
      return [];
    }
  }
};
