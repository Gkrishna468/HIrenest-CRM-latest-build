import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
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
        avatar: data.avatar || '',
        phone: data.phone || '',
        status: data.status || 'active',
        gmailConnected: data.gmailConnected || false,
        gmailEmail: data.gmailEmail,
        gmailConnectionId: data.gmailConnectionId,
        loginCount: data.loginCount || 0,
        mustChangePassword: data.mustChangePassword || false,
        temporaryPassword: data.temporaryPassword || '',
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${id}`);
      return null;
    }
  },

  async getByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      const data = d.data();
      return {
        id: d.id,
        email: data.email || '',
        name: data.name || '',
        role: data.role || 'viewer',
        companyId: data.companyId,
        avatar: data.avatar || '',
        phone: data.phone || '',
        status: data.status || 'active',
        gmailConnected: data.gmailConnected || false,
        gmailEmail: data.gmailEmail,
        gmailConnectionId: data.gmailConnectionId,
        loginCount: data.loginCount || 0,
        mustChangePassword: data.mustChangePassword || false,
        temporaryPassword: data.temporaryPassword || '',
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/email/${email}`);
      return null;
    }
  },

  async create(id: string, data: Partial<User>): Promise<User> {
    const user: User = {
      id,
      email: (data.email || '').toLowerCase().trim(),
      name: data.name || '',
      role: data.role || 'viewer',
      companyId: data.companyId || null,
      phone: data.phone || '',
      avatar: data.avatar || '',
      status: data.status || 'active',
      gmailConnected: data.gmailConnected || false,
      gmailEmail: data.gmailEmail || null,
      gmailConnectionId: data.gmailConnectionId || null,
      loginCount: data.loginCount !== undefined ? data.loginCount : 0,
      mustChangePassword: data.mustChangePassword !== undefined ? data.mustChangePassword : false,
      temporaryPassword: data.temporaryPassword || '',
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
        if (key === 'email' && typeof val === 'string') {
          cleanUpdates[key] = val.toLowerCase().trim();
        } else {
          cleanUpdates[key] = val;
        }
      }
    });
    try {
      await updateDoc(docRef, cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
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
          avatar: data.avatar || '',
          phone: data.phone || '',
          status: data.status || 'active',
          gmailConnected: data.gmailConnected || false,
          gmailEmail: data.gmailEmail,
          gmailConnectionId: data.gmailConnectionId,
          loginCount: data.loginCount || 0,
          mustChangePassword: data.mustChangePassword || false,
          temporaryPassword: data.temporaryPassword || '',
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  }
};
