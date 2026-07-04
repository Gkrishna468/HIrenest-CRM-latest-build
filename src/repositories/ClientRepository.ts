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

      // Extract organization names from users
      const usersSnap = await getDocs(collection(db, 'users'));
      const orgNames = new Map<string, string>();
      usersSnap.docs.forEach(d => {
        const data = d.data();
        if (data.organizationId) {
          let name = data.companyName;
          if (!name && data.email) {
             const domain = data.email.split('@')[1];
             if (domain && domain !== 'gmail.com' && domain !== 'yahoo.com' && domain !== 'outlook.com') {
               name = domain.split('.')[0];
               name = name.charAt(0).toUpperCase() + name.slice(1);
             }
          }
          if (name) orgNames.set(data.organizationId, name);
        }
      });

      // Extract unique clients from requirements (OS data)
      const reqsSnap = await getDocs(collection(db, 'requirements'));
      const reqsClientsMap = new Map<string, Client>();
      reqsSnap.docs.forEach(d => {
        const data = d.data();
        const clientId = data.clientId || data.client_id;
        let clientName = data.clientName || data.client_name;
        if (!clientName && clientId) {
          clientName = orgNames.get(clientId) || `Client ${clientId.slice(-5)}`;
        }
        if (clientId && !reqsClientsMap.has(clientId)) {
          reqsClientsMap.set(clientId, {
            id: clientId,
            company: clientName,
            name: clientName,
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
        let clientName = data.clientName || data.client_name;
        if (!clientName && clientId) {
          clientName = orgNames.get(clientId) || `Client ${clientId.slice(-5)}`;
        }
        if (clientId && !pubClientsMap.has(clientId)) {
          pubClientsMap.set(clientId, {
            id: clientId,
            company: clientName,
            name: clientName,
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

      const extractedPubClients = Array.from(pubClientsMap.values()) as Client[];

      const finalExistingIds = new Set(firebaseClients.map(c => c.id));
      const newPubExtracted = extractedPubClients.filter(c => !finalExistingIds.has(c.id));

      const combined = [...newPubExtracted, ...firebaseClients];
      const seen = new Set<string>();
      const unique = combined.filter(c => {
        if (!c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      return unique.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
