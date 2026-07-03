import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/services/firebase/config";
import { RequirementRepository } from "../repositories/RequirementRepository";

/**
 * ADJUST BUDGET: Calculates HireNest margin based on client tier
 */
export async function calculateAdjustedBudget(companyId: string, budget: number): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'client_profiles', companyId));
    const margin = snap.exists() ? (snap.data()?.margin_preferred || 20) : 20;
    return budget * (1 - margin / 100);
  } catch (error) {
    console.warn("Could not calculate adjusted budget from client_profiles:", error);
    return budget * 0.8; // default 20% margin
  }
}

/**
 * BROADCAST JOB: Makes job visible to vendors
 */
export async function broadcastJob(jobId: string) {
  if (!jobId) {
    console.error("broadcastJob called with empty jobId");
    return;
  }
  
  const job = await RequirementRepository.getById(jobId);
  if (!job) {
    console.error("broadcastJob: Job not found");
    return;
  }

  await RequirementRepository.update(jobId, { broadcast_to_vendors: true } as any);

  // SYSTEM LOG
  await addDoc(collection(db, 'agent_logs'), {
    type: 'notification',
    level: 'info',
    message: `[OUTREACH AGENT] Job broadcasted to marketplace: "${job.title}". Initiating vendor-partner awareness sequence.`,
    metadata: { jobId, broadcast: true, channel: 'system' },
    createdAt: new Date().toISOString()
  });

  // SIMULATE OUTREACH IN Intelligence Center
  await addDoc(collection(db, 'agent_logs'), {
    type: 'outreach',
    level: 'success',
    message: `[WHATSAPP AGENT] Sent notification to 12 Top-Tier Vendors regarding new requisition: ${job.title}. AI logic predicts 3-5 immediate submissions.`,
    metadata: { jobId, channel: 'whatsapp', status: 'sent', recipientCount: 12 },
    createdAt: new Date().toISOString()
  });
}

/**
 * PROPOSE COLLABORATION: AI or Vendor initiates a match
 */
export async function proposeCollaboration(params: {
  jobId: string;
  candidateId: string;
  vendorId: string;
  clientId: string;
  matchScore: number;
}) {
  const collabId = crypto.randomUUID();
  const collabData = {
    id: collabId,
    job_id: params.jobId,
    candidate_id: params.candidateId,
    vendor_id: params.vendorId,
    client_id: params.clientId,
    match_score: params.matchScore,
    status: 'proposed',
    createdAt: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  await setDoc(doc(db, 'collaborations', collabId), collabData);

  // Create conversation for this collaboration
  const convoId = crypto.randomUUID();
  await setDoc(doc(db, 'conversations', convoId), {
    id: convoId,
    collaboration_id: collabId,
    createdAt: new Date().toISOString(),
  });

  return collabData;
}

/**
 * SEND MESSAGE: Group communication
 */
export async function sendMessage(conversationId: string, content: string, senderId: string, isAi: boolean = false) {
  const messageId = crypto.randomUUID();
  await setDoc(doc(db, 'messages', messageId), {
    id: messageId,
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    is_ai_assisted: isAi,
    createdAt: new Date().toISOString()
  });

  // Update last activity on collaboration
  try {
    const convoSnap = await getDoc(doc(db, 'conversations', conversationId));
    if (convoSnap.exists()) {
      const collabId = convoSnap.data().collaboration_id;
      if (collabId) {
        await updateDoc(doc(db, 'collaborations', collabId), {
          last_activity_at: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error("Failed to update last activity on collaboration:", error);
  }
}
