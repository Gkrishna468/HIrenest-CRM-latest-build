import { collection, doc, setDoc, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './error';
import { eventService } from './eventService';

export interface Account {
  id: string;
  companyName: string;
  industry: string;
  status: string;
  ownerId: string;
}

export const accountService = {
  createAccount: async (data: Omit<Account, 'id' | 'ownerId'>) => {
    try {
      const id = crypto.randomUUID();
      const ownerId = auth.currentUser?.uid;
      if (!ownerId) throw new Error('Unauthenticated');
      
      const account: Account = { ...data, id, ownerId };
      await setDoc(doc(db, 'accounts', id), account);
      
      // Log event
      await eventService.logEvent({
        eventType: 'ACCOUNT_CREATED',
        entityType: 'account',
        entityId: id,
        metadata: { companyName: data.companyName }
      });
      return account;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'accounts');
    }
  },

  getAccounts: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'accounts'));
      return snapshot.docs.map(doc => doc.data() as Account);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
      return [];
    }
  }
};
