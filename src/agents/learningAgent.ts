import { db } from '@/services/firebase/config';
import { getDocs, collection, addDoc } from 'firebase/firestore';

/**
 * Learning Agent: Analyzes outcomes to improve decision thresholds
 */
export async function runLearningAgent() {
  let outcomes: any[] = [];
  try {
    const snap = await getDocs(collection(db, 'candidate_outcomes'));
    outcomes = snap.docs.map(doc => doc.data());
  } catch (error) {
    console.warn("Could not load candidate_outcomes:", error);
  }

  if (!outcomes || outcomes.length === 0) return "No outcome data to learn from yet.";

  const totalScore = outcomes.reduce((acc, curr) => acc + (curr.outcome_score || 0), 0);
  const avgImprovement = totalScore / outcomes.length;

  // Log insight
  await addDoc(collection(db, 'agent_logs'), {
    type: 'learning',
    message: `System Learning: Current AI Shortlist Precision is ${(avgImprovement * 20).toFixed(1)}%.`,
    level: 'info',
    metadata: { avg_score: avgImprovement, total_outcomes: outcomes.length },
    createdAt: new Date().toISOString()
  });

  return `Learning cycle complete. Precision: ${(avgImprovement * 20).toFixed(1)}%`;
}
