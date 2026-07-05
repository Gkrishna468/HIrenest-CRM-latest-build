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
        status: data.status || 'active',
        secretKey: data.secretKey || '',
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
      let firebaseVendors: Vendor[] = snap.docs.map(d => {
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
          status: data.status || 'active',
          secretKey: data.secretKey || '',
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

      // Extract unique vendors from candidates (OS data)
      const candsSnap = await getDocs(collection(db, 'candidates'));
      const reqsVendorsMap = new Map<string, Vendor>();
      candsSnap.docs.forEach(d => {
        const data = d.data();
        const vendorId = data.vendorId || data.vendor_id;
        if (vendorId && !reqsVendorsMap.has(vendorId)) {
          const vendorName = orgNames.get(vendorId) || `Vendor ${vendorId.slice(-6)}`;
          reqsVendorsMap.set(vendorId, {
            id: vendorId,
            name: vendorName,
            type: 'vendor',
            company: vendorName,
            email: '',
            phone: '',
            location: '',
            specialization: [],
            isRecruiter: false,
            recruiterCompany: '',
            vendorCode: vendorId,
            userId: '',
            companyId: vendorId,
            createdAt: safeISOString(data.createdAt || data.created_at),
            updatedAt: safeISOString(data.updatedAt || data.updated_at),
            source: 'os' as 'os'
          });
        }
      });

      const extractedVendors = Array.from(reqsVendorsMap.values()) as Vendor[];
      const existingIds = new Set(firebaseVendors.map(c => c.id));
      const newExtracted = extractedVendors.filter(c => !existingIds.has(c.id));
      firebaseVendors = [...firebaseVendors, ...newExtracted];

      const seen = new Set<string>();
      const unique = firebaseVendors.filter(v => {
        if (!v.id || seen.has(v.id)) return false;
        seen.add(v.id);
        return true;
      });

      return unique.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      status: data.status || 'active',
      secretKey: data.secretKey || '',
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
