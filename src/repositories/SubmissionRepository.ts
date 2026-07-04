import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { Submission } from '@/types';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';
import { safeISOString } from '@/utils/safe';

export const SubmissionRepository = {
  async getById(id: string): Promise<Submission | null> {
    try {
      const snap = await getDoc(doc(db, 'submissions', id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        jobId: data.jobId || data.job_id || '',
        candidateId: data.candidateId || data.candidate_id || '',
        vendorId: data.vendorId || data.vendor_id || '',
        candidateName: data.candidateName || data.candidate_name || '',
        jobTitle: data.jobTitle || data.job_title || '',
        status: data.status || 'submitted',
        notes: data.notes || '',
        userId: data.userId || data.user_id || '',
        createdAt: safeISOString(data.createdAt || data.created_at),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `submissions/${id}`);
      return null;
    }
  },

  async list(): Promise<Submission[]> {
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          jobId: data.jobId || data.job_id || '',
          candidateId: data.candidateId || data.candidate_id || '',
          vendorId: data.vendorId || data.vendor_id || '',
          candidateName: data.candidateName || data.candidate_name || '',
          jobTitle: data.jobTitle || data.job_title || '',
          status: data.status || 'submitted',
          notes: data.notes || '',
          userId: data.userId || data.user_id || '',
          createdAt: safeISOString(data.createdAt || data.created_at),
        };
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      return [];
    }
  },

  async create(data: Partial<Submission>): Promise<Submission> {
    const id = data.id || crypto.randomUUID();
    const submission: Submission = {
      id,
      jobId: data.jobId || '',
      candidateId: data.candidateId || '',
      vendorId: data.vendorId || '',
      candidateName: data.candidateName || '',
      jobTitle: data.jobTitle || '',
      status: data.status || 'submitted',
      notes: data.notes || '',
      userId: data.userId || '',
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'submissions', id), submission);
      return submission;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `submissions/${id}`);
      throw error;
    }
  },

  // Transactions: Use transactions for operations such as Candidate submissions
  async createWithTransaction(data: Partial<Submission>): Promise<Submission> {
    const id = data.id || crypto.randomUUID();
    const submission: Submission = {
      id,
      jobId: data.jobId || '',
      candidateId: data.candidateId || '',
      vendorId: data.vendorId || '',
      candidateName: data.candidateName || '',
      jobTitle: data.jobTitle || '',
      status: data.status || 'submitted',
      notes: data.notes || '',
      userId: data.userId || '',
      createdAt: new Date().toISOString(),
    };

    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, 'submissions', id);
        transaction.set(docRef, submission);
      });
      return submission;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `submissions/${id}`);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Submission>): Promise<void> {
    try {
      await updateDoc(doc(db, 'submissions', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${id}`);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'submissions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `submissions/${id}`);
    }
  }
};
