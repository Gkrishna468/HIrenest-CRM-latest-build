import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { Deal } from '@/types';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';
import { safeISOString } from '@/utils/safe';

export const PricingRepository = {
  async getDealById(id: string): Promise<Deal | null> {
    try {
      const snap = await getDoc(doc(db, 'deals', id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        jobId: data.jobId || data.job_id || '',
        candidateId: data.candidateId || data.candidate_id || '',
        vendorId: data.vendorId || data.vendor_id || '',
        clientId: data.clientId || data.client_id || '',
        clientName: data.clientName || data.client_name || '',
        jobTitle: data.jobTitle || data.job_title || '',
        candidateName: data.candidateName || data.candidate_name || '',
        status: data.status || 'prospect',
        offeredCtc: data.offeredCtc || data.offered_ctc || 0,
        finalCtc: data.finalCtc || data.final_ctc || 0,
        commissionPercent: data.commissionPercent || data.commission_percent || 0,
        revenueAmount: data.revenueAmount || data.revenue_amount || 0,
        vendorShare: data.vendorShare || data.vendor_share || 0,
        payoutAmount: data.payoutAmount || data.payout_amount || 0,
        profitAmount: data.profitAmount || data.profit_amount || 0,
        paymentReceived: data.paymentReceived || data.payment_received || false,
        joinedDate: data.joinedDate || data.joined_date || '',
        userId: data.userId || data.user_id || '',
        createdAt: safeISOString(data.createdAt || data.created_at),
        revenue_amount: data.revenueAmount || data.revenue_amount || 0, // compatibility
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `deals/${id}`);
      return null;
    }
  },

  async listDeals(): Promise<Deal[]> {
    try {
      const snap = await getDocs(collection(db, 'deals'));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          jobId: data.jobId || data.job_id || '',
          candidateId: data.candidateId || data.candidate_id || '',
          vendorId: data.vendorId || data.vendor_id || '',
          clientId: data.clientId || data.client_id || '',
          clientName: data.clientName || data.client_name || '',
          jobTitle: data.jobTitle || data.job_title || '',
          candidateName: data.candidateName || data.candidate_name || '',
          status: data.status || 'prospect',
          offeredCtc: data.offeredCtc || data.offered_ctc || 0,
          finalCtc: data.finalCtc || data.final_ctc || 0,
          commissionPercent: data.commissionPercent || data.commission_percent || 0,
          revenueAmount: data.revenueAmount || data.revenue_amount || 0,
          vendorShare: data.vendorShare || data.vendor_share || 0,
          payoutAmount: data.payoutAmount || data.payout_amount || 0,
          profitAmount: data.profitAmount || data.profit_amount || 0,
          paymentReceived: data.paymentReceived || data.payment_received || false,
          joinedDate: data.joinedDate || data.joined_date || '',
          userId: data.userId || data.user_id || '',
          createdAt: safeISOString(data.createdAt || data.created_at),
          revenue_amount: data.revenueAmount || data.revenue_amount || 0, // compatibility
        };
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'deals');
      return [];
    }
  },

  async createDeal(data: Partial<Deal>): Promise<Deal> {
    const id = data.id || crypto.randomUUID();
    const deal: Deal = {
      id,
      jobId: data.jobId || '',
      candidateId: data.candidateId || '',
      vendorId: data.vendorId || '',
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      jobTitle: data.jobTitle || '',
      candidateName: data.candidateName || '',
      status: data.status || 'prospect',
      offeredCtc: data.offeredCtc || 0,
      finalCtc: data.finalCtc || 0,
      commissionPercent: data.commissionPercent || 0,
      revenueAmount: data.revenueAmount || data.revenue_amount || 0,
      vendorShare: data.vendorShare || 0,
      payoutAmount: data.payoutAmount || 0,
      profitAmount: data.profitAmount || 0,
      paymentReceived: data.paymentReceived || false,
      joinedDate: data.joinedDate || '',
      userId: data.userId || '',
      createdAt: new Date().toISOString(),
      revenue_amount: data.revenueAmount || data.revenue_amount || 0, // compatibility
    };
    try {
      await setDoc(doc(db, 'deals', id), deal);
      return deal;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `deals/${id}`);
      throw error;
    }
  },

  async updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
    try {
      await updateDoc(doc(db, 'deals', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deals/${id}`);
    }
  },

  async deleteDeal(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'deals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deals/${id}`);
    }
  }
};
