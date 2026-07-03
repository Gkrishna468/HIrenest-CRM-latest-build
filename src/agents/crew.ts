import { runDecisionAgent } from '@/services/intelligenceService';
import { runOutreachAgent } from './outreachAgent';
import { runReplyAgent } from './replyAgent';
import { runLearningAgent } from './learningAgent';
import { db } from '@/services/firebase/config';
import { addDoc, collection } from 'firebase/firestore';

/**
 * Crew: The multi-agent orchestrator
 */
export async function runCrew() {
  const startTime = Date.now();
  
  await addDoc(collection(db, 'agent_logs'), {
    type: 'crew',
    message: 'Autonomous Crew mission initiated.',
    level: 'info',
    status: 'running',
    createdAt: new Date().toISOString()
  });

  try {
    // 1. Decisions (Matching & Shortlisting)
    const decisionRes = await runDecisionAgent();
    
    // 2. Outreach (Communicating)
    const outreachRes = await runOutreachAgent();
    
    // 3. Replies (Listening)
    const replyRes = await runReplyAgent();
    
    // 4. Learning (Improving)
    const learningRes = await runLearningAgent();

    const duration = Date.now() - startTime;
    
    await addDoc(collection(db, 'agent_logs'), {
      type: 'crew',
      message: `Mission Complete. Decisions: ${decisionRes} | Responses: ${replyRes} | Knowledge: ${learningRes}`,
      level: 'success',
      status: 'finished',
      metadata: { duration_ms: duration },
      createdAt: new Date().toISOString()
    });

    return "All agents successfully completed their cycles.";
  } catch (err: any) {
    console.error('Crew Failure:', err);
    await addDoc(collection(db, 'agent_logs'), {
      type: 'crew',
      message: `Mission aborted: ${err.message}`,
      level: 'error',
      status: 'failed',
      createdAt: new Date().toISOString()
    });
    throw err;
  }
}
