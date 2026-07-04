import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { Job } from '@/types';
import { syncOrchestrator } from '@/services/firebase/syncOrchestrator';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';
import { safeISOString } from '@/utils/safe';

export const RequirementRepository = {
  async getById(id: string): Promise<Job | null> {
    try {
      const snap = await getDoc(doc(db, 'requirements', id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        companyId: data.companyId || data.company_id || '',
        title: data.title || '',
        description: data.description || '',
        location: data.location || '',
        type: data.type || '',
        salary: data.salary || '',
        budget: data.budget || 0,
        adjustedBudget: data.adjustedBudget || data.adjusted_budget || 0,
        skills: data.skills || [],
        experienceRequired: data.experienceRequired || data.experience_required || '',
        openings: data.openings || 1,
        submissionsCount: data.submissionsCount || data.submissions_count || 0,
        status: data.status || 'pending',
        approvalStatus: data.approvalStatus || data.approval_status || 'pending',
        clientId: data.clientId || data.client_id || '',
        clientName: data.clientName || data.client_name || '',
        userId: data.userId || data.user_id || '',
        closedDate: data.closedDate || data.closed_date || '',
        createdAt: safeISOString(data.createdAt || data.created_at),
        updatedAt: safeISOString(data.updatedAt || data.updated_at),
        pricing_data: data.pricing_data || null,
        broadcast_to_vendors: data.broadcast_to_vendors || false,
      } as any;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `requirements/${id}`);
      return null;
    }
  },

  async list(): Promise<Job[]> {
    try {
      const snap = await getDocs(collection(db, 'requirements'));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          companyId: data.companyId || data.company_id || '',
          title: data.title || '',
          description: data.description || '',
          location: data.location || '',
          type: data.type || '',
          salary: data.salary || '',
          budget: data.budget || 0,
          adjustedBudget: data.adjustedBudget || data.adjusted_budget || 0,
          skills: data.skills || [],
          experienceRequired: data.experienceRequired || data.experience_required || '',
          openings: data.openings || 1,
          submissionsCount: data.submissionsCount || data.submissions_count || 0,
          status: data.status || 'pending',
          approvalStatus: data.approvalStatus || data.approval_status || 'pending',
          clientId: data.clientId || data.client_id || '',
          clientName: data.clientName || data.client_name || '',
          userId: data.userId || data.user_id || '',
          closedDate: data.closedDate || data.closed_date || '',
          createdAt: safeISOString(data.createdAt || data.created_at),
          updatedAt: safeISOString(data.updatedAt || data.updated_at),
          pricing_data: data.pricing_data || null,
          broadcast_to_vendors: data.broadcast_to_vendors || false,
        } as any;
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'requirements');
      return [];
    }
  },

  async create(data: Partial<Job>, performedBy: string = 'System'): Promise<Job> {
    const id = data.id || crypto.randomUUID();
    const requirement: any = {
      id,
      companyId: data.companyId || data.clientId || '',
      title: data.title || '',
      description: data.description || '',
      location: data.location || '',
      type: data.type || '',
      salary: data.salary || '',
      budget: data.budget || 0,
      adjustedBudget: data.adjustedBudget || 0,
      skills: data.skills || [],
      experienceRequired: data.experienceRequired || '',
      openings: data.openings || 1,
      submissionsCount: 0,
      status: data.status || 'pending',
      approvalStatus: data.approvalStatus || 'pending',
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      userId: data.userId || '',
      closedDate: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      broadcastToVendors: data.broadcastToVendors || false,
    };
    try {
      await setDoc(doc(db, 'requirements', id), requirement);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `requirements/${id}`);
    }

    try {
      // Publish to central Sync Orchestrator / Company Ledger
      await syncOrchestrator.publishEvent('REQUIREMENT_CREATED', {
        requirementId: id,
        title: requirement.title,
        performedBy
      });
    } catch (error) {
      console.warn('Sync events publishing skipped or failed:', error);
    }

    return requirement as Job;
  },

  // Transactions: Use transactions for operations such as Requirement creation/modification
  async createWithTransaction(data: Partial<Job>, performedBy: string = 'System'): Promise<Job> {
    const id = data.id || crypto.randomUUID();
    const requirement: any = {
      id,
      companyId: data.companyId || data.clientId || '',
      title: data.title || '',
      description: data.description || '',
      location: data.location || '',
      type: data.type || '',
      salary: data.salary || '',
      budget: data.budget || 0,
      adjustedBudget: data.adjustedBudget || 0,
      skills: data.skills || [],
      experienceRequired: data.experienceRequired || '',
      openings: data.openings || 1,
      submissionsCount: 0,
      status: data.status || 'pending',
      approvalStatus: data.approvalStatus || 'pending',
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      userId: data.userId || '',
      closedDate: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      broadcastToVendors: data.broadcastToVendors || false,
    };

    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, 'requirements', id);
        transaction.set(docRef, requirement);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `requirements/${id}`);
    }

    try {
      // Publish to central Sync Orchestrator / Company Ledger
      await syncOrchestrator.publishEvent('REQUIREMENT_CREATED', {
        requirementId: id,
        title: requirement.title,
        performedBy,
        transaction: true
      });
    } catch (error) {
      console.warn('Sync events publishing skipped or failed:', error);
    }

    return requirement;
  },

  async update(id: string, updates: Partial<Job>, performedBy: string = 'System'): Promise<void> {
    const docRef = doc(db, 'requirements', id);
    const cleanUpdates: any = { ...updates, updatedAt: new Date().toISOString() };
    
    // Support legacy field mappings
    if (updates.experienceRequired !== undefined) cleanUpdates.experience_required = updates.experienceRequired;
    if (updates.approvalStatus !== undefined) {
      cleanUpdates.approval_status = updates.approvalStatus;
      cleanUpdates.approvalStatus = updates.approvalStatus;
    }
    if (updates.clientId !== undefined) cleanUpdates.client_id = updates.clientId;
    if (updates.clientName !== undefined) cleanUpdates.client_name = updates.clientName;
    if (updates.budget !== undefined) cleanUpdates.budget = updates.budget;

    try {
      await updateDoc(docRef, cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requirements/${id}`);
    }

    try {
      // Publish to central Sync Orchestrator / Company Ledger
      await syncOrchestrator.publishEvent('REQUIREMENT_UPDATED', {
        requirementId: id,
        updates: Object.keys(updates),
        performedBy
      });
    } catch (error) {
      console.warn('Sync events publishing skipped or failed:', error);
    }
  },

  async delete(id: string, performedBy: string = 'System'): Promise<void> {
    try {
      await deleteDoc(doc(db, 'requirements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requirements/${id}`);
    }

    try {
      // Publish to central Sync Orchestrator / Company Ledger
      await syncOrchestrator.publishEvent('REQUIREMENT_DELETED', {
        requirementId: id,
        performedBy
      });
    } catch (error) {
      console.warn('Sync events publishing skipped or failed:', error);
    }
  }
};
