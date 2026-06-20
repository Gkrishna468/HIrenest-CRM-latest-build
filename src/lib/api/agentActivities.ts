import { collection, query, orderBy, limit, onSnapshot, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase/config";

export interface AgentActivity {
  id: string;
  agent: string;
  status: string;
  state: "working" | "completed" | "waiting";
  metadata?: any;
  timestamp: string;
}

export function subscribeToAgentActivities(callback: (activities: AgentActivity[]) => void) {
  const q = query(
    collection(db, "agent_activities"),
    orderBy("timestamp", "desc"),
    limit(4)
  );

  return onSnapshot(q, (snapshot) => {
    const activities: AgentActivity[] = [];
    snapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() } as AgentActivity);
    });
    callback(activities);
  });
}

export async function addAgentActivity(data: Omit<AgentActivity, "id">) {
  await addDoc(collection(db, "agent_activities"), data);
}
