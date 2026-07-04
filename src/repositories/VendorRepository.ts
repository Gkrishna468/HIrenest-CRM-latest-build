import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { Vendor } from '@/types';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';
import { safeISOString } from '@/utils/safe';

export const VendorRepository = {
  async getById(id: string): Promise<Vendor | null> {
    try {
      const snap = await getDoc(doc(db, 'vendors', id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        name: data.name || '',
        type: data.type || 'vendor',
        company: data.company || '',
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || '',
        specialization: data.specialization || [],
        isRecruiter: data.isRecruiter || false,
        recruiterCompany: data.recruiterCompany || '',
        vendorCode: data.vendorCode || '',
        userId: data.userId || '',
        companyId: data.companyId || '',
        createdAt: safeISOString(data.createdAt || data.created_at),
        updatedAt: safeISOString(data.updatedAt || data.updated_at),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `vendors/${id}`);
      return null;
    }
  },

  async list(): Promise<Vendor[]> {
    try {
      const snap = await getDocs(collection(db, 'vendors'));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          type: data.type || 'vendor',
          company: data.company || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          specialization: data.specialization || [],
          isRecruiter: data.isRecruiter || false,
          recruiterCompany: data.recruiterCompany || '',
          vendorCode: data.vendorCode || '',
          userId: data.userId || '',
          companyId: data.companyId || '',
          createdAt: safeISOString(data.createdAt || data.created_at),
          updatedAt: safeISOString(data.updatedAt || data.updated_at),
        };
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
      return [];
    }
  },

  async create(data: Partial<Vendor>): Promise<Vendor> {
    const id = data.id || crypto.randomUUID();
    const vendor: Vendor = {
      id,
      name: data.name || '',
      type: data.type || 'vendor',
      company: data.company || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      specialization: data.specialization || [],
      isRecruiter: data.isRecruiter || false,
      recruiterCompany: data.recruiterCompany || '',
      vendorCode: data.vendorCode || '',
      userId: data.userId || '',
      companyId: data.companyId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'vendors', id), vendor);
      return vendor;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vendors/${id}`);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Vendor>): Promise<void> {
    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    try {
      await updateDoc(doc(db, 'vendors', id), cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vendors/${id}`);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'vendors', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vendors/${id}`);
    }
  }
};
