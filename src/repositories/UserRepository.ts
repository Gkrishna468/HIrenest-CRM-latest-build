import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { User, Role } from '@/types';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';

export const UserRepository = {
  async getById(id: string): Promise<User | null> {
    try {
      const docRef = doc(db, 'users', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        email: data.email || '',
        name: data.name || '',
        role: data.role || 'viewer',
        companyId: data.companyId,
        status: data.status || 'active',
        gmailConnected: data.gmailConnected || false,
        gmailEmail: data.gmailEmail,
        gmailConnectionId: data.gmailConnectionId,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${id}`);
      return null;
    }
  },

  async create(id: string, data: Partial<User>): Promise<User> {
    const user: User = {
      id,
      email: data.email || '',
      name: data.name || '',
      role: data.role || 'viewer',
      companyId: data.companyId || null,
      status: data.status || 'active',
      gmailConnected: data.gmailConnected || false,
      gmailEmail: data.gmailEmail || null,
      gmailConnectionId: data.gmailConnectionId || null,
    };
    try {
      await setDoc(doc(db, 'users', id), user);
      return user;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${id}`);
      throw error;
    }
  },

  async update(id: string, updates: Partial<User>): Promise<void> {
    const docRef = doc(db, 'users', id);
    const cleanUpdates: any = {};
    Object.keys(updates).forEach((key) => {
      const val = (updates as any)[key];
      if (val !== undefined) {
        cleanUpdates[key] = val;
      }
    });
    try {
      await updateDoc(docRef, cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  },

  async list(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          email: data.email || '',
          name: data.name || '',
          role: data.role || 'viewer',
          companyId: data.companyId,
          status: data.status || 'active',
          gmailConnected: data.gmailConnected || false,
          gmailEmail: data.gmailEmail,
          gmailConnectionId: data.gmailConnectionId,
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  }
};
