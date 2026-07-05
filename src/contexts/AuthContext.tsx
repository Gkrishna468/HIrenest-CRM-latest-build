/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Role } from '@/types';
import { toast } from 'sonner';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, db } from '@/services/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserRepository } from '@/repositories/UserRepository';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: Role) => Promise<void>;
  signOut: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const apiFetch = async (url: string, options?: RequestInit) => {
    let token = '';
    const execSession = localStorage.getItem('hirenest_exec_session');
    if (execSession) {
      token = 'executive-bypass-token';
    } else if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    
    const headers = {
      ...options?.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check for Executive Session first
        const execSession = localStorage.getItem('hirenest_exec_session');
        if (execSession) {
          const parsed = JSON.parse(execSession);
          if (parsed.email === 'admin@hirenest.com') {
             parsed.email = 'gopal@hirenestworkforce.com';
             parsed.name = 'Gopal Krishna';
             localStorage.setItem('hirenest_exec_session', JSON.stringify(parsed));
          }
          setUser(parsed);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };

    checkSession();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const isExecRoot = firebaseUser.uid === 'me995j91dmNkwfXXfaCyrDo8oa03' || firebaseUser.email === 'admin@hirenestworkforce.com';
          const profile = await UserRepository.getById(firebaseUser.uid);
          if (profile) {
            if (isExecRoot && profile.role !== 'admin') {
              profile.role = 'admin';
              await UserRepository.update(firebaseUser.uid, { role: 'admin' });
            }
            setUser(profile);
          } else {
            // Check if there is an unlinked pre-created profile by email
            const preCreatedProfile = firebaseUser.email ? await UserRepository.getByEmail(firebaseUser.email) : null;
            if (preCreatedProfile) {
              const claimedUser = await UserRepository.create(firebaseUser.uid, {
                email: firebaseUser.email || '',
                name: preCreatedProfile.name,
                role: preCreatedProfile.role,
                phone: preCreatedProfile.phone,
                status: preCreatedProfile.status,
                companyId: preCreatedProfile.companyId,
              });
              
              if (preCreatedProfile.id !== firebaseUser.uid) {
                await UserRepository.delete(preCreatedProfile.id);
              }
              setUser(claimedUser);
            } else {
              // Fallback: create default user document in Firestore if not exists
              const fallbackUser = await UserRepository.create(firebaseUser.uid, {
                email: firebaseUser.email || '',
                name: isExecRoot ? 'Gopal Krishna' : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'),
                role: isExecRoot ? 'admin' : 'viewer',
                status: 'active',
              });
              setUser(fallbackUser);
            }
          }
        } catch (err) {
          console.error('Error resolving user profile:', err);
          const isExecRoot = firebaseUser.uid === 'me995j91dmNkwfXXfaCyrDo8oa03' || firebaseUser.email === 'admin@hirenestworkforce.com';
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: isExecRoot ? 'Gopal Krishna' : (firebaseUser.email?.split('@')[0] || 'User'),
            role: isExecRoot ? 'admin' : 'viewer',
            status: 'active',
          });
        }
      } else {
        // Only set null if there's no executive bypass active
        const execSession = localStorage.getItem('hirenest_exec_session');
        if (!execSession) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Executive Bypass for GOPAL and Demo Admin
    if (
      (email === 'gopal@hirenestworkforce.com' && password === 'founding2026') ||
      (email === 'admin@hirenestworkforce.com' && password === 'founding2026') ||
      (email === 'admin@hirenest.com' && password === 'admin123')
    ) {
      const execUser: User = { 
        id: email === 'admin@hirenestworkforce.com' ? 'me995j91dmNkwfXXfaCyrDo8oa03' : 'executive-root', 
        email: email === 'admin@hirenest.com' ? 'gopal@hirenestworkforce.com' : email, // Force email sync for Gmail connection
        name: 'Gopal Krishna', 
        role: 'admin', 
        status: 'active',
        loginCount: 3, // Bypasses constraint
      };
      
      setUser(execUser);
      localStorage.setItem('hirenest_exec_session', JSON.stringify(execUser));
      toast.success('Executive access granted');
      return;
    }

    // Direct Firebase Sign In
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await UserRepository.getById(cred.user.uid);
    if (profile) {
      const newCount = (profile.loginCount || 0) + 1;
      await UserRepository.update(cred.user.uid, { loginCount: newCount });
      setUser({ ...profile, loginCount: newCount });
    }
    toast.success('Signed in successfully');
  };

  const signUp = async (email: string, password: string, name: string, role: Role) => {
    // Direct Firebase Sign Up
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // Check if there is an unlinked pre-created profile by email
    const preCreatedProfile = await UserRepository.getByEmail(email);
    if (preCreatedProfile) {
      const claimedUser = await UserRepository.create(cred.user.uid, {
        email,
        name: preCreatedProfile.name || name,
        role: preCreatedProfile.role || role,
        phone: preCreatedProfile.phone,
        status: preCreatedProfile.status || 'active',
        companyId: preCreatedProfile.companyId,
        loginCount: 1,
        mustChangePassword: false,
      });
      if (preCreatedProfile.id !== cred.user.uid) {
        await UserRepository.delete(preCreatedProfile.id);
      }
      setUser(claimedUser);
    } else {
      // Create user profile in Firestore immediately
      await UserRepository.create(cred.user.uid, {
        email,
        name,
        role,
        status: 'active',
        loginCount: 1,
        mustChangePassword: false,
      });
    }
    toast.success('Account registered successfully');
  };

  const signOut = async () => {
    localStorage.removeItem('hirenest_exec_session');
    await firebaseSignOut(auth);
    setUser(null);
    toast.success('Signed out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
