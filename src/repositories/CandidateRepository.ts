import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { Candidate } from '@/types';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';
import { safeISOString, safeBudget } from '@/utils/safe';

export const CandidateRepository = {
  async getById(id: string): Promise<Candidate | null> {
    try {
      const snap = await getDoc(doc(db, 'candidates', id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        source: data.source || 'os',
        vendorCompanyId: data.vendorCompanyId || data.vendor_company_id || '',
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        skills: data.skills || [],
        experience: data.experience || 0,
        yearsExperience: data.yearsExperience || data.years_experience || 0,
        currentCompany: data.currentCompany || data.current_company || '',
        currentTitle: data.currentTitle || data.current_title || '',
        expectedSalary: safeBudget(data.expectedSalary || data.expected_salary),
        location: data.location || '',
        status: data.status || 'active',
        stage: data.stage || 'sourced',
        vendorId: data.vendorId || data.vendor_id || '',
        vendorName: data.vendorName || data.vendor_name || '',
        vendorCode: data.vendorCode || data.vendor_code || '',
        clientId: data.clientId || data.client_id || '',
        jobId: data.jobId || data.job_id || '',
        jobTitle: data.jobTitle || data.job_title || '',
        resumeUrl: data.resumeUrl || data.resume_url || '',
        notes: data.notes || '',
        aiMatchScore: data.aiMatchScore || data.ai_match_score || 0,
        assignedBdm: data.assignedBdm || data.assigned_bdm || '',
        fraudDetected: data.fraudDetected || data.fraud_detected || false,
        userId: data.userId || data.user_id || '',
        companyId: data.companyId || data.company_id || '',
        createdAt: safeISOString(data.createdAt || data.created_at),
        updatedAt: safeISOString(data.updatedAt || data.updated_at),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `candidates/${id}`);
      return null;
    }
  },

  async list(): Promise<Candidate[]> {
    let candidates: Candidate[] = [];
    let resumeCandidates: Candidate[] = [];

    try {
      const snap = await getDocs(collection(db, 'candidates'));
      candidates = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          source: data.source || 'os',
          vendorCompanyId: data.vendorCompanyId || data.vendor_company_id || '',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          skills: data.skills || [],
          experience: data.experience || 0,
          yearsExperience: data.yearsExperience || data.years_experience || 0,
          currentCompany: data.currentCompany || data.current_company || '',
          currentTitle: data.currentTitle || data.current_title || '',
          expectedSalary: safeBudget(data.expectedSalary || data.expected_salary),
          location: data.location || '',
          status: data.status || 'active',
          stage: data.stage || 'sourced',
          vendorId: data.vendorId || data.vendor_id || '',
          vendorName: data.vendorName || data.vendor_name || '',
          vendorCode: data.vendorCode || data.vendor_code || '',
          clientId: data.clientId || data.client_id || '',
          jobId: data.jobId || data.job_id || '',
          jobTitle: data.jobTitle || data.job_title || '',
          resumeUrl: data.resumeUrl || data.resume_url || '',
          notes: data.notes || '',
          aiMatchScore: data.aiMatchScore || data.ai_match_score || 0,
          assignedBdm: data.assignedBdm || data.assigned_bdm || '',
          fraudDetected: data.fraudDetected || data.fraud_detected || false,
          userId: data.userId || data.user_id || '',
          companyId: data.companyId || data.company_id || '',
          createdAt: safeISOString(data.createdAt || data.created_at),
          updatedAt: safeISOString(data.updatedAt || data.updated_at),
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'candidates');
    }

    try {
      // Also fetch resumes to map resumeCandidates, as in the previous getAllCandidates function
      const resumeSnap = await getDocs(collection(db, 'resumes'));
      resumeCandidates = resumeSnap.docs.map(rDoc => {
        const r = rDoc.data();
        return {
          id: `resume-${rDoc.id}`,
          name: r.candidate_name || r.name || 'Resume Candidate',
          email: r.candidate_email || '',
          phone: r.candidate_phone || '',
          skills: r.extracted_skills || r.skills || [],
          experience: 0,
          yearsExperience: 0,
          status: 'active',
          stage: 'sourced',
          resumeUrl: r.url || '',
          notes: `From resume: ${r.file_name || r.fileName || 'Document'}`,
          source: 'resume',
          createdAt: safeISOString(r.created_at || r.createdAt),
          updatedAt: safeISOString(r.created_at || r.createdAt),
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'resumes');
    }

    return [...candidates, ...resumeCandidates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async create(data: Partial<Candidate>): Promise<Candidate> {
    const id = data.id || crypto.randomUUID();
    const candidate: Candidate = {
      id,
      source: data.source || 'os',
      vendorCompanyId: data.vendorCompanyId || '',
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      skills: data.skills || [],
      experience: data.experience || 0,
      yearsExperience: data.yearsExperience || 0,
      currentCompany: data.currentCompany || '',
      currentTitle: data.currentTitle || '',
      expectedSalary: data.expectedSalary || '',
      location: data.location || '',
      status: data.status || 'active',
      stage: data.stage || 'sourced',
      vendorId: data.vendorId || '',
      vendorName: data.vendorName || '',
      vendorCode: data.vendorCode || '',
      clientId: data.clientId || '',
      jobId: data.jobId || '',
      jobTitle: data.jobTitle || '',
      resumeUrl: data.resumeUrl || '',
      notes: data.notes || '',
      aiMatchScore: data.aiMatchScore || 0,
      assignedBdm: data.assignedBdm || '',
      fraudDetected: data.fraudDetected || false,
      userId: data.userId || '',
      companyId: data.companyId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'candidates', id), candidate);
      return candidate;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `candidates/${id}`);
      throw error;
    }
  },

  // Transactions: Use transactions for operations such as Candidate submissions/creation
  async createWithTransaction(data: Partial<Candidate>): Promise<Candidate> {
    const id = data.id || crypto.randomUUID();
    const candidate: Candidate = {
      id,
      source: data.source || 'os',
      vendorCompanyId: data.vendorCompanyId || '',
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      skills: data.skills || [],
      experience: data.experience || 0,
      yearsExperience: data.yearsExperience || 0,
      currentCompany: data.currentCompany || '',
      currentTitle: data.currentTitle || '',
      expectedSalary: data.expectedSalary || '',
      location: data.location || '',
      status: data.status || 'active',
      stage: data.stage || 'sourced',
      vendorId: data.vendorId || '',
      vendorName: data.vendorName || '',
      vendorCode: data.vendorCode || '',
      clientId: data.clientId || '',
      jobId: data.jobId || '',
      jobTitle: data.jobTitle || '',
      resumeUrl: data.resumeUrl || '',
      notes: data.notes || '',
      aiMatchScore: data.aiMatchScore || 0,
      assignedBdm: data.assignedBdm || '',
      fraudDetected: data.fraudDetected || false,
      userId: data.userId || '',
      companyId: data.companyId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, 'candidates', id);
        transaction.set(docRef, candidate);
      });
      return candidate;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `candidates/${id}`);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Candidate>): Promise<void> {
    const docRef = doc(db, 'candidates', id);
    const cleanUpdates: any = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.vendorCompanyId !== undefined) cleanUpdates.vendor_company_id = updates.vendorCompanyId;
    if (updates.aiMatchScore !== undefined) cleanUpdates.ai_match_score = updates.aiMatchScore;
    try {
      await updateDoc(docRef, cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `candidates/${id}`);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'candidates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `candidates/${id}`);
    }
  }
};
