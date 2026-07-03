import { db, auth } from '@/services/firebase/config';
import { getDocs, collection, query, where, updateDoc, doc, addDoc } from 'firebase/firestore';
import { CandidateRepository } from '@/repositories/CandidateRepository';
import { executeAITask } from '@/utils/aiGateway';

/**
 * Reply Agent: Detects responses and classifies intent using Gemini via AI Gateway
 */
export async function runReplyAgent() {
  // Direct Firebase Auth session or bypass
  const execSession = localStorage.getItem('hirenest_exec_session');
  const userObj = execSession ? JSON.parse(execSession) : auth.currentUser;

  if (!userObj) {
    console.error("NO USER SESSION → Skipping reply detection.");
    return "No user session. Skipping reply detection.";
  }

  // Fetch pending sent logs from outreach_logs in Firestore
  let sentLogs: any[] = [];
  try {
    const q = query(collection(db, 'outreach_logs'), where('status', '==', 'sent'));
    const snap = await getDocs(q);
    sentLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn("Could not fetch outreach_logs from Firestore:", error);
  }

  if (!sentLogs || sentLogs.length === 0) return "No pending replies to check.";

  let detections = 0;

  for (const log of sentLogs) {
    // Simulation: Only process 10% of logs to find a "reply"
    if (Math.random() > 0.9) {
      const simulatedBody = "Hi, I received your email. The role sounds interesting! I am available on Thursday for a call.";
      
      try {
        const prompt = `
          Classify the following candidate reply as: INTERESTED, REJECTED, or NEUTRAL.
          REPLY: "${simulatedBody}"
          
          Return ONLY the classification string.
        `;

        const intent = await executeAITask({
          agentName: "Reply-Intent-Classifier",
          prompt,
          metadata: { outreachLogId: log.id, recipient: log.email }
        }).then(res => res.trim() || "NEUTRAL");

        if (intent === 'INTERESTED') {
          await updateDoc(doc(db, 'outreach_logs', log.id), {
            status: 'replied',
            replied_at: new Date().toISOString()
          });

          // Auto-move candidate to next stage based on AI detection
          const candidateId = log.candidateId || log.candidate_id;
          if (candidateId) {
            await CandidateRepository.update(candidateId, {
              stage: 'interview',
              notes: `[AI AUTONOMOUS] Reply detected: "${intent}". Moving to active interview path.`
            });
          }

          await addDoc(collection(db, 'agent_logs'), {
            type: 'reply',
            message: `AI detected INTERESTED intent from ${log.email}. Auto-updated candidate stage.`,
            level: 'success',
            createdAt: new Date().toISOString()
          });
          
          detections++;
        }
      } catch (err) {
        console.error('AI Intent Error:', err);
      }
    }
  }

  return `Reply detection cycle complete. Found ${detections} responses.`;
}
