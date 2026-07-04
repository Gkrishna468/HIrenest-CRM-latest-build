import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { VendorBroadcast } from '@/types';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';
import { safeISOString } from '@/utils/safe';

export const BroadcastRepository = {
  async getById(id: string): Promise<VendorBroadcast | null> {
    try {
      const snap = await getDoc(doc(db, 'broadcasts', id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        broadcastId: data.broadcastId || data.broadcast_id || '',
        requirementId: data.requirementId || data.requirement_id || '',
        requirementTitle: data.requirementTitle || data.requirement_title || '',
        channel: data.channel || '',
        vendorId: data.vendorId || data.vendor_id || '',
        vendorName: data.vendorName || data.vendor_name || '',
        sentAt: safeISOString(data.sentAt || data.sent_at),
        status: data.status || 'sent',
        source: data.source || '',
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `broadcasts/${id}`);
      return null;
    }
  },

  async list(): Promise<VendorBroadcast[]> {
    try {
      const snap = await getDocs(collection(db, 'broadcasts'));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          broadcastId: data.broadcastId || data.broadcast_id || '',
          requirementId: data.requirementId || data.requirement_id || '',
          requirementTitle: data.requirementTitle || data.requirement_title || '',
          channel: data.channel || '',
          vendorId: data.vendorId || data.vendor_id || '',
          vendorName: data.vendorName || data.vendor_name || '',
          sentAt: safeISOString(data.sentAt || data.sent_at),
          status: data.status || 'sent',
          source: data.source || '',
        };
      }).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'broadcasts');
      return [];
    }
  },

  async create(data: Partial<VendorBroadcast>): Promise<VendorBroadcast> {
    const id = data.id || crypto.randomUUID();
    const broadcast: VendorBroadcast = {
      id,
      broadcastId: data.broadcastId || crypto.randomUUID(),
      requirementId: data.requirementId || '',
      requirementTitle: data.requirementTitle || '',
      channel: data.channel || '',
      vendorId: data.vendorId || '',
      vendorName: data.vendorName || '',
      sentAt: new Date().toISOString(),
      status: data.status || 'sent',
      source: data.source || '',
    };
    try {
      await setDoc(doc(db, 'broadcasts', id), broadcast);
      return broadcast;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `broadcasts/${id}`);
      throw error;
    }
  },

  async update(id: string, updates: Partial<VendorBroadcast>): Promise<void> {
    try {
      await updateDoc(doc(db, 'broadcasts', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `broadcasts/${id}`);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'broadcasts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `broadcasts/${id}`);
    }
  }
};
