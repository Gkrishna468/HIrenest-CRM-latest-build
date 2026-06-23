import { Firestore } from "firebase-admin/firestore";

export interface SystemEvent {
  id?: string;
  event: string;
  payload: any;
  status: "pending" | "processed" | "failed";
  timestamp: string;
  source: string;
}

export interface AgentTask {
  id?: string;
  task: string;
  status: "queued" | "running" | "completed" | "failed";
  payload: any;
  createdAt: string;
  updatedAt: string;
  agentId: string;
  result?: any;
  error?: string;
  retries?: number;
  maxRetries?: number;
}

export class AgentRuntime {
  private db: Firestore;
  private isProcessing: boolean = false;

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Initializes the Agent Runtime.
   * Sets up listeners for system_events to generate tasks.
   */
  start() {
    console.log("[AgentRuntime] Starting up...");
    
    // Listen to pending system events
    this.db.collection("system_events")
      .where("status", "==", "pending") // Note: legacy events without status won't trigger this, which is good.
      .onSnapshot(async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === "added") {
            const eventInfo = { id: change.doc.id, ...change.doc.data() } as SystemEvent;
            await this.processEvent(eventInfo);
          }
        }
      }, (error) => {
        console.error("[AgentRuntime] Event listener error:", error);
      });

    // Listen to queued agent tasks
    this.db.collection("agent_tasks")
      .where("status", "==", "queued")
      .onSnapshot(async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === "added") {
            const taskInfo = { id: change.doc.id, ...change.doc.data() } as AgentTask;
            await this.executeTask(taskInfo);
          }
        }
      }, (error) => {
        console.error("[AgentRuntime] Task listener error:", error);
      });
  }

  private async processEvent(event: SystemEvent) {
    if (!event.id) return;
    console.log(`[AgentRuntime] Processing event: ${event.event} (${event.id})`);

    try {
      // Map events to agent tasks
      if (event.event === "requirement.created") {
        await this.queueTask("extract_requirement", "requirement_agent", event.payload);
        await this.queueTask("match_candidates", "matching_agent", event.payload);
      }
      
      if (event.event === "candidate.created") {
        await this.queueTask("extract_candidate", "candidate_agent", event.payload);
        await this.queueTask("match_requirements", "matching_agent", event.payload);
      }

      // Mark event as processed
      await this.db.collection("system_events").doc(event.id).update({
        status: "processed",
        processedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(`[AgentRuntime] Failed processing event ${event.id}:`, err);
      // Mark event as failed
      await this.db.collection("system_events").doc(event.id).update({
        status: "failed",
        error: err.message,
        processedAt: new Date().toISOString()
      });
    }
  }

  private async queueTask(taskName: string, agentId: string, payload: any, maxRetries: number = 3) {
    const task: AgentTask = {
      task: taskName,
      agentId,
      status: "queued",
      payload,
      retries: 0,
      maxRetries,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const ref = await this.db.collection("agent_tasks").add(task);
    console.log(`[AgentRuntime] Queued task: ${taskName} for ${agentId} (${ref.id})`);
  }

  private async executeTask(task: AgentTask) {
    if (!task.id) return;
    console.log(`[AgentRuntime] Executing task: ${task.task} (${task.id})`);

    // 1. Mark as running
    await this.db.collection("agent_tasks").doc(task.id).update({
      status: "running",
      updatedAt: new Date().toISOString()
    });

    // 2. Create an execution record with Ownership Details
    const executionRef = await this.db.collection("agent_executions").add({
      taskId: task.id,
      taskName: task.task,
      agentId: task.agentId,
      agentVersion: "1.0.0", // Tracking agent versions
      provider: "gemini",    // Abstracted provider tracking
      status: "running",
      startedAt: new Date().toISOString()
    });

    try {
      // TODO: Actually execute agent logic here based on task.task
      // For now, simulate brief execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = { success: true, message: `Completed ${task.task}` };

      // 3. Mark as completed
      await this.db.collection("agent_tasks").doc(task.id).update({
        status: "completed",
        result,
        updatedAt: new Date().toISOString()
      });

      await this.db.collection("agent_executions").doc(executionRef.id).update({
        status: "completed",
        endedAt: new Date().toISOString(),
        result
      });
      
      // 4. Log completion
      await this.db.collection("agent_logs").add({
        taskId: task.id,
        level: "info",
        message: `Task ${task.task} completed successfully`,
        timestamp: new Date().toISOString()
      });

      // 5. Update Agent Memory (Simulated generic update for now)
      await this.db.collection("agent_memory").doc(task.agentId).set({
        agentId: task.agentId,
        lastExecutionTask: task.task,
        lastExecutionTime: new Date().toISOString(),
        tasksCompleted: Firestore.FieldValue.increment(1)
      }, { merge: true });

    } catch (err: any) {
      console.error(`[AgentRuntime] Failed task ${task.id}:`, err);
      
      await this.db.collection("agent_executions").doc(executionRef.id).update({
        status: "failed",
        endedAt: new Date().toISOString(),
        error: err.message
      });
      
      await this.db.collection("agent_logs").add({
        taskId: task.id,
        level: "error",
        message: `Task ${task.task} failed: ${err.message}`,
        timestamp: new Date().toISOString()
      });

      const currentRetries = task.retries || 0;
      const maxRetries = task.maxRetries || 3;

      if (currentRetries < maxRetries) {
        // Retry logic
        const nextRetry = currentRetries + 1;
        console.log(`[AgentRuntime] Retrying task ${task.id} (Attempt ${nextRetry}/${maxRetries})`);
        await this.db.collection("agent_tasks").doc(task.id).update({
          status: "queued",
          retries: nextRetry,
          updatedAt: new Date().toISOString(),
          error: `${err.message} (Retry ${nextRetry})`
        });
      } else {
        // Exceeded retries, mark as permanently failed and send to dead letter queue
        console.error(`[AgentRuntime] Task ${task.id} permanently failed after ${maxRetries} retries.`);
        await this.db.collection("agent_tasks").doc(task.id).update({
          status: "failed",
          error: err.message,
          updatedAt: new Date().toISOString()
        });

        await this.db.collection("dead_letter_queue").add({
          taskId: task.id,
          taskName: task.task,
          agentId: task.agentId,
          payload: task.payload,
          error: err.message,
          failedAt: new Date().toISOString()
        });
      }
    }
  }
}
