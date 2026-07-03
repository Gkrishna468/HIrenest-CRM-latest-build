import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { Client } from '@/types';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';

export const ClientRepository = {
  async getById(id: string): Promise<Client | null> {
    try {
      const snap = await getDoc(doc(db, 'clients', id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        company: data.company || '',
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || '',
        industry: data.industry || '',
        budget: data.budget || '',
        contactPerson: data.contactPerson || data.contact_person || '',
        website: data.website || '',
        clientCode: data.clientCode || data.client_code || '',
        notes: data.notes || '',
        userId: data.userId || data.user_id || '',
        companyId: data.companyId || data.company_id || '',
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `clients/${id}`);
      return null;
    }
  },

  async list(): Promise<Client[]> {
    try {
      const snap = await getDocs(collection(db, 'clients'));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          company: data.company || '',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          industry: data.industry || '',
          budget: data.budget || '',
          contactPerson: data.contactPerson || data.contact_person || '',
          website: data.website || '',
          clientCode: data.clientCode || data.client_code || '',
          notes: data.notes || '',
          userId: data.userId || data.user_id || '',
          companyId: data.companyId || data.company_id || '',
          createdAt: data.createdAt || data.created_at || new Date().toISOString(),
          updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
        };
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'clients');
      return [];
    }
  },

  async create(data: Partial<Client>): Promise<Client> {
    const id = data.id || crypto.randomUUID();
    const client: Client = {
      id,
      company: data.company || '',
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      industry: data.industry || '',
      budget: data.budget || '',
      contactPerson: data.contactPerson || '',
      website: data.website || '',
      clientCode: data.clientCode || '',
      notes: data.notes || '',
      userId: data.userId || '',
      companyId: data.companyId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'clients', id), client);
      return client;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `clients/${id}`);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Client>): Promise<void> {
    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    try {
      await updateDoc(doc(db, 'clients', id), cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
  }
};
