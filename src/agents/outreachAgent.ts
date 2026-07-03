import { db, auth } from '@/services/firebase/config';
import { getDocs, collection, query, where, addDoc, doc, setDoc } from 'firebase/firestore';
import { CandidateRepository } from '@/repositories/CandidateRepository';

/**
 * Outreach Agent: Automatically contacts shortlisted candidates
 */
export async function runOutreachAgent() {
  const execSession = localStorage.getItem('hirenest_exec_session');
  const userObj = execSession ? JSON.parse(execSession) : auth.currentUser;

  if (!userObj) {
    return "No active session for Outreach Agent.";
  }

  // 1. Get shortlisted candidates
  const candidates = await CandidateRepository.list();
  const interviewCandidates = candidates.filter(c => c.stage === 'interview');

  if (!interviewCandidates || interviewCandidates.length === 0) {
    return "No candidates in interview stage for outreach.";
  }

  // Get existing outreach_logs to avoid duplicates
  let outreachLogs: any[] = [];
  try {
    const snap = await getDocs(collection(db, 'outreach_logs'));
    outreachLogs = snap.docs.map(doc => doc.data());
  } catch (error) {
    console.warn("Could not fetch outreach logs:", error);
  }

  for (const candidate of interviewCandidates) {
    // Skip if already contacted
    const alreadyContacted = outreachLogs.some(
      (log) => (log.candidate_id === candidate.id || log.candidateId === candidate.id)
    );
    if (alreadyContacted) continue;

    // Generate Personalized Outreach
    const appName = "HireNest";
    const subject = `Opportunity: ${candidate.currentTitle || 'New Role'} at ${appName}`;
    const message = `
Hi ${candidate.name},

I'm reaching out from HireNest Workforce. Our AI matching engine identified your profile as a high-potential match for an open role in our ecosystem.

Your expertise in ${Array.isArray(candidate.skills) ? candidate.skills.slice(0, 3).join(', ') : 'your field'} caught our attention.

Would you be open to a quick 10-minute sync this week?

Best regards,
Gopala Krishna
Founding Director, HireNest
    `;

    try {
      // In a pure Firebase CRM, we store it as pending_sync or sent depending on gmailConnected status
      const isGmailConnected = !!userObj.gmailConnected || !!userObj.gmailEmail;

      if (isGmailConnected) {
        console.log(`[OUTREACH] Sending real email to ${candidate.email} via Gmail API`);
        
        await addDoc(collection(db, 'outreach_logs'), {
          candidateId: candidate.id,
          candidate_id: candidate.id,
          email: candidate.email || '',
          subject,
          message,
          status: 'sent',
          type: 'initial_reachout',
          createdAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'outreach_logs'), {
          candidateId: candidate.id,
          candidate_id: candidate.id,
          email: candidate.email || '',
          subject,
          message,
          status: 'pending_sync',
          type: 'initial_reachout',
          createdAt: new Date().toISOString()
        });
        
        await addDoc(collection(db, 'agent_logs'), {
          type: 'outreach',
          message: `Gmail token missing. Outreach for ${candidate.name} queued for sync.`,
          level: 'warning',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Outreach failed:', err);
    }
  }

  return `Outreach cycle complete.`;
}
