import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './error';
import { eventService } from './eventService';

export interface RevenuePipeline {
  id: string;
  requirementId: string;
  accountId: string;
  stage: 'draft' | 'sourced' | 'submitted' | 'interviewing' | 'offered' | 'placed' | 'invoiced' | 'paid';
  expectedAmount: number;
  probability: number;
}

export const revenueService = {
  createRevenueEntry: async (data: Omit<RevenuePipeline, 'id'>) => {
    try {
      const id = crypto.randomUUID();
      const entry: RevenuePipeline = { ...data, id };
      await setDoc(doc(db, 'revenue_pipeline', id), entry);
      
      await eventService.logEvent({
        eventType: 'REVENUE_PIPELINE_CREATED',
        entityType: 'revenue_pipeline',
        entityId: id,
        metadata: { stage: data.stage, expectedAmount: data.expectedAmount }
      });
      return entry;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'revenue_pipeline');
    }
  },

  getRevenuePipeline: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'revenue_pipeline'));
      return snapshot.docs.map(doc => doc.data() as RevenuePipeline);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'revenue_pipeline');
      return [];
    }
  }
};
