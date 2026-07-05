/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { ClientRepository } from "@/repositories/ClientRepository";
import { VendorRepository } from "@/repositories/VendorRepository";
import { RequirementRepository } from "@/repositories/RequirementRepository";
import { CandidateRepository } from "@/repositories/CandidateRepository";
import { PricingRepository } from "@/repositories/PricingRepository";
import { UserRepository } from "@/repositories/UserRepository";
import { db } from "@/services/firebase/config";
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc } from "firebase/firestore";
import type { Client, Vendor, Job, Candidate, AgentLog, Deal } from "@/types";

interface DataContextType {
  clients: Client[];
  vendors: Vendor[];
  jobs: Job[];
  candidates: Candidate[];
  logs: AgentLog[];
  deals: any[];
  userProfile: any | null;
  loading: boolean;
  refreshAll: () => Promise<void>;
  addClient: (data: Partial<Client>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  addVendor: (data: Partial<Vendor>) => Promise<void>;
  updateVendor: (id: string, data: Partial<Vendor>) => Promise<void>;
  addJob: (data: Partial<Job>) => Promise<void>;
  updateJob: (id: string, data: Partial<Job>) => Promise<void>;
  addCandidate: (data: Partial<Candidate>) => Promise<void>;
  updateCandidate: (id: string, data: Partial<Candidate>) => Promise<void>;
  updateCandidateStatus: (
    id: string,
    stage: Candidate["stage"],
    status?: string,
  ) => Promise<void>;
  approveJobWithBudget: (id: string, budget: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch User Profile first for context
      const profile = await UserRepository.getById(user.id);
      setUserProfile(profile);

      const [cData, vData, jData, candData, dealData] = await Promise.all([
        ClientRepository.list(),
        VendorRepository.list(),
        RequirementRepository.list(),
        CandidateRepository.list(),
        PricingRepository.listDeals(),
      ]);

      setClients(cData);
      setVendors(vData);
      setJobs(jData);
      setCandidates(candData);
      setDeals(dealData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Realtime logs via Firestore onSnapshot
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "agent_logs"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsList: AgentLog[] = [];
      snapshot.forEach((d) => {
        const l = d.data();
        logsList.push({
          id: d.id,
          type: l.type || "info",
          level: l.level === "success" ? "success" : l.level || "info",
          message: l.message || "",
          metadata: l.metadata,
          companyId: l.companyId || l.company_id,
          createdAt: l.createdAt || l.created_at || new Date().toISOString(),
        } as AgentLog);
      });
      setLogs(logsList);
    }, (error) => {
      // Index error might happen in firestore if index is not ready yet, fallback gracefully
      console.warn("Firestore onSnapshot warning for agent_logs (likely missing index):", error);
    });

    return () => unsubscribe();
  }, [user]);

  const addClient = async (data: Partial<Client>) => {
    // Auto-generate Client Code if not present: CL-YYMM-RAND
    if (!data.clientCode) {
      const year = new Date().getFullYear().toString().slice(-2);
      const rand = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      data.clientCode = `CL-${year}${rand}`;
    }
    
    const clientPayload = {
      ...data,
      source: data.source || "crm",
      userId: user?.id || "",
      companyId: userProfile?.companyId || "",
    };
    
    await ClientRepository.create(clientPayload);
    
    // Log event in Firestore Company Ledger
    const logId = crypto.randomUUID();
    await setDoc(doc(db, "agent_logs", logId), {
      type: "client",
      level: "info",
      message: `Client "${data.company}" added to CRM ledger.`,
      createdAt: new Date().toISOString(),
      userId: user?.id || "system",
    });

    await refreshAll();
  };

  const updateClientData = async (id: string, data: Partial<Client>) => {
    await ClientRepository.update(id, data);
    await refreshAll();
  };

  const addVendor = async (data: Partial<Vendor>) => {
    // Auto-generate Vendor Code: HN-VND-XXXXXX sequentially
    if (!data.vendorCode) {
      let nextNum = 1;
      const hnCodes = vendors
        .map(v => v.vendorCode || '')
        .filter(code => code.startsWith('HN-VND-'));
      if (hnCodes.length > 0) {
        const numbers = hnCodes.map(code => parseInt(code.replace('HN-VND-', ''), 10)).filter(num => !isNaN(num));
        if (numbers.length > 0) {
          nextNum = Math.max(...numbers) + 1;
        }
      } else {
        nextNum = vendors.length + 1;
      }
      const formattedNum = nextNum.toString().padStart(6, "0");
      data.vendorCode = `HN-VND-${formattedNum}`;
    }
    if (!data.companyId && userProfile?.companyId) {
      data.companyId = userProfile.companyId;
    }

    if (!data.secretKey) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Clear alphanumeric chars to avoid 1/I and 0/O confusion
      const part1 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const part2 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const part3 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      data.secretKey = `${part1}-${part2}-${part3}`;
    }

    const vendorPayload: Partial<Vendor> = {
      ...data,
      source: data.source || "vendor",
      userId: user?.id || "",
      organizationId: data.companyId || userProfile?.companyId || "ORG-y0kbdp8a0h",
      status: "active",
      createdBy: user?.id || "system",
    };

    const createdVendor = await VendorRepository.create(vendorPayload);

    // Log event in Firestore
    const logId = crypto.randomUUID();
    await setDoc(doc(db, "agent_logs", logId), {
      type: "vendor",
      level: "info",
      message: `Vendor Partner "${data.name}" onboarded under permanent code ${vendorPayload.vendorCode}.`,
      createdAt: new Date().toISOString(),
      userId: user?.id || "system",
    });

    // Law 1 Ledger Event
    await setDoc(doc(db, "system_events", crypto.randomUUID()), {
      type: "VENDOR_CREATED",
      message: `Vendor Partner "${data.name}" onboarded under permanent code ${vendorPayload.vendorCode}.`,
      timestamp: new Date().toISOString(),
      entityType: "vendor",
      entityId: createdVendor.id,
      role: "system",
      data: {
        vendorName: data.name,
        vendorCode: vendorPayload.vendorCode,
        organizationId: vendorPayload.organizationId,
        status: "active"
      }
    });

    await refreshAll();
  };

  const updateVendorData = async (id: string, data: Partial<Vendor>) => {
    await VendorRepository.update(id, data);
    await refreshAll();
  };

  const addJob = async (data: Partial<Job>) => {
    const jobPayload = {
      ...data,
      source: data.source || "os",
      userId: user?.id || "",
      companyId: userProfile?.companyId || "",
    };

    await RequirementRepository.create(jobPayload);

    // Log event in Firestore
    const logId = crypto.randomUUID();
    await setDoc(doc(db, "agent_logs", logId), {
      type: "job",
      level: "info",
      message: `Requisition "${data.title}" drafted and pending approval.`,
      createdAt: new Date().toISOString(),
      userId: user?.id || "system",
    });

    await refreshAll();
  };

  const updateJobData = async (id: string, data: Partial<Job>) => {
    await RequirementRepository.update(id, data);
    await refreshAll();
  };

  const addCandidate = async (data: Partial<Candidate>) => {
    const candPayload = {
      ...data,
      source: data.source || "os",
      userId: user?.id || "",
      companyId: userProfile?.companyId || "",
    };

    await CandidateRepository.create(candPayload);

    // Log event in Firestore
    const logId = crypto.randomUUID();
    await setDoc(doc(db, "agent_logs", logId), {
      type: "candidate",
      level: "info",
      message: `Candidate profile "${data.name}" ingested into core pool.`,
      createdAt: new Date().toISOString(),
      userId: user?.id || "system",
    });

    await refreshAll();
  };

  const updateCandidateData = async (id: string, data: Partial<Candidate>) => {
    await CandidateRepository.update(id, data);
    await refreshAll();
  };

  const updateCandidateStatus = async (
    id: string,
    stage: Candidate["stage"],
    status?: string,
  ) => {
    await CandidateRepository.update(id, { stage, status });
    await refreshAll();
  };

  const approveJobWithBudget = async (id: string, budget: string) => {
    await RequirementRepository.update(id, {
      approvalStatus: "approved",
      budget,
      status: "open",
    });

    // Log event in Firestore
    const logId = crypto.randomUUID();
    await setDoc(doc(db, "agent_logs", logId), {
      type: "revenue",
      level: "success",
      message: `CFO approved requisition ID ${id} with target budget ₹${budget}.`,
      createdAt: new Date().toISOString(),
      userId: user?.id || "system",
    });

    await refreshAll();
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        vendors,
        jobs,
        candidates,
        logs,
        deals,
        userProfile,
        loading,
        refreshAll,
        addClient,
        updateClient: updateClientData,
        addVendor,
        updateVendor: updateVendorData,
        addJob,
        updateJob: updateJobData,
        addCandidate,
        updateCandidate: updateCandidateData,
        updateCandidateStatus,
        approveJobWithBudget,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
