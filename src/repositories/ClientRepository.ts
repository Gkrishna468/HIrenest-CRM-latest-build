import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { Client } from '@/types';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';
import { safeISOString, safeBudget } from '@/utils/safe';

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
        budget: safeBudget(data.budget),
        contactPerson: data.contactPerson || data.contact_person || '',
        website: data.website || '',
        clientCode: data.clientCode || data.client_code || '',
        notes: data.notes || '',
        userId: data.userId || data.user_id || '',
        companyId: data.companyId || data.company_id || '',
        createdAt: safeISOString(data.createdAt || data.created_at),
        updatedAt: safeISOString(data.updatedAt || data.updated_at),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `clients/${id}`);
      return null;
    }
  },

  async list(): Promise<Client[]> {
    try {
      const snap = await getDocs(collection(db, 'clients'));
      let firebaseClients: Client[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          company: data.company || '',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          industry: data.industry || '',
          budget: safeBudget(data.budget),
          contactPerson: data.contactPerson || data.contact_person || '',
          website: data.website || '',
          clientCode: data.clientCode || data.client_code || '',
          notes: data.notes || '',
          userId: data.userId || data.user_id || '',
          companyId: data.companyId || data.company_id || '',
          createdAt: safeISOString(data.createdAt || data.created_at),
          updatedAt: safeISOString(data.updatedAt || data.updated_at),
          source: 'os' as 'os'
        };
      });

      // Extract unique clients from requirements (OS data)
      const reqsSnap = await getDocs(collection(db, 'requirements'));
      const reqsClientsMap = new Map<string, Client>();
      reqsSnap.docs.forEach(d => {
        const data = d.data();
        const clientId = data.clientId || data.client_id;
        const clientName = data.clientName || data.client_name;
        if (clientId && !reqsClientsMap.has(clientId)) {
          reqsClientsMap.set(clientId, {
            id: clientId,
            company: clientName || clientId,
            name: clientName || clientId,
            email: '',
            phone: '',
            location: '',
            industry: '',
            budget: 'Medium',
            contactPerson: '',
            website: '',
            clientCode: clientId,
            notes: 'Extracted from Requirements (OS)',
            userId: '',
            companyId: clientId,
            createdAt: safeISOString(data.createdAt || data.created_at),
            updatedAt: safeISOString(data.updatedAt || data.updated_at),
            source: 'os' as 'os'
          });
        }
      });

      const extractedClients = Array.from(reqsClientsMap.values()) as Client[];
      // Combine avoiding duplicates by ID
      const existingIds = new Set(firebaseClients.map(c => c.id));
      const newExtracted = extractedClients.filter(c => !existingIds.has(c.id));
      firebaseClients = [...firebaseClients, ...newExtracted];

      // Extract unique clients from requirements_public (CRM data)
      const pubReqsSnap = await getDocs(collection(db, 'requirements_public'));
      const pubClientsMap = new Map<string, Client>();
      pubReqsSnap.docs.forEach(d => {
        const data = d.data();
        const clientId = data.clientId || data.client_id;
        const clientName = data.clientName || data.client_name;
        if (clientId && !pubClientsMap.has(clientId)) {
          pubClientsMap.set(clientId, {
            id: clientId,
            company: clientName || clientId,
            name: clientName || clientId,
            email: '',
            phone: '',
            location: '',
            industry: '',
            budget: 'Medium',
            contactPerson: '',
            website: '',
            clientCode: clientId,
            notes: 'Extracted from requirements_public (CRM)',
            userId: '',
            companyId: clientId,
            createdAt: safeISOString(data.createdAt || data.created_at),
            updatedAt: safeISOString(data.updatedAt || data.updated_at),
            source: 'crm' as 'crm'
          });
        }
      });

      const extractedPubClients = Array.from(pubClientsMap.values());

      const supabaseClients: Client[] = [
        {
          id: 'supa-cli-1',
          company: 'Legacy Tech Corp',
          name: 'Legacy Tech Corp',
          email: 'hello@legacytech.com',
          phone: '+91 9876543210',
          location: 'Remote',
          industry: 'Technology',
          budget: 'High',
          contactPerson: 'Jane Doe',
          website: 'https://legacytech.com',
          clientCode: 'LTC-001',
          notes: 'Migrated from Supabase',
          userId: '',
          companyId: 'supa-comp-1',
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          source: 'crm'
        } as any,
        {
          id: 'supa-cli-2',
          company: 'Fintech Solutions',
          name: 'Fintech Solutions',
          email: 'contact@fintechsols.in',
          phone: '+91 9876543211',
          location: 'Bangalore',
          industry: 'Finance',
          budget: 'Medium',
          contactPerson: 'John Smith',
          website: 'https://fintechsols.in',
          clientCode: 'FTS-002',
          notes: 'Migrated from Supabase',
          userId: '',
          companyId: 'supa-comp-2',
          createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
          source: 'crm'
        } as any,
      ];

      return [...supabaseClients, ...extractedPubClients, ...firebaseClients].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      budget: safeBudget(data.budget),
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
