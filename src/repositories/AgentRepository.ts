import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { handleFirestoreError, OperationType } from '@/services/firebase/error';

export const AgentRepository = {
  subscribeToTasks(callback: (tasks: any[]) => void, onError?: (err: any) => void) {
    return onSnapshot(
      collection(db, 'agent_tasks'),
      (snap) => {
        const tasks: any[] = [];
        snap.forEach((doc) => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        callback(tasks);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'agent_tasks');
        if (onError) onError(error);
      }
    );
  },

  subscribeToExecutions(callback: (executions: any[]) => void, onError?: (err: any) => void) {
    const q = query(collection(db, 'agent_executions'));
    return onSnapshot(
      q,
      (snap) => {
        const execs: any[] = [];
        snap.forEach((doc) => {
          execs.push({ id: doc.id, ...doc.data() });
        });
        execs.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
        callback(execs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'agent_executions');
        if (onError) onError(error);
      }
    );
  },

  async getExecutionLogs(taskId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'agent_logs'),
        where('taskId', '==', taskId)
      );
      const snap = await getDocs(q);
      const logs: any[] = [];
      snap.forEach((d) => {
        logs.push({ id: d.id, ...d.data() });
      });
      logs.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
      return logs;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'agent_logs');
      return [];
    }
  },

  async listLogs(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'agent_logs'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'agent_logs');
      return [];
    }
  }
};
