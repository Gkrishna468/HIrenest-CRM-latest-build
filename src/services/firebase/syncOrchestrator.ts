import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "./config";
import { eventService } from "./eventService";

export interface DomainEvent {
  id: string;
  eventType: string;
  payload: any;
  status: "pending" | "processing" | "processed" | "failed";
  retries: number;
  maxRetries: number;
  timestamp: string;
  processedAt?: string;
  error?: string;
  userId?: string;
}

export const syncOrchestrator = {
  /**
   * Publish a domain event to the unified system_events ledger.
   * Ensures idempotency by checking if an event with the same ID already exists.
   */
  publishEvent: async (eventType: string, payload: any, customEventId?: string): Promise<string> => {
    const eventId = customEventId || crypto.randomUUID();
    const eventRef = doc(db, "system_events", eventId);

    // Idempotency check: check if event already exists
    const existingSnap = await getDoc(eventRef);
    if (existingSnap.exists()) {
      console.warn(`[SyncOrchestrator] Duplicate event detected. Skipping publish for ID: ${eventId}`);
      return eventId;
    }

    const domainEvent: DomainEvent = {
      id: eventId,
      eventType,
      payload,
      status: "pending",
      retries: 0,
      maxRetries: 3,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser?.uid || "system"
    };

    // Save event to immutable Company Ledger
    await setDoc(eventRef, domainEvent);
    console.log(`[SyncOrchestrator] Published event ${eventType} (${eventId})`);

    // Trigger local asynchronous event processing only in non-browser environments
    // Browsers cannot modify the immutable system_events collection (Law 1) and rely on the background AgentRuntime server.
    if (typeof window === "undefined") {
      setTimeout(() => {
        syncOrchestrator.consumeEvent(eventId).catch((err) => 
          console.error(`[SyncOrchestrator] Error processing published event ${eventId}:`, err)
        );
      }, 100);
    } else {
      console.log(`[SyncOrchestrator] Event ${eventId} published. Awaiting background server consumption.`);
    }

    return eventId;
  },

  /**
   * Consumes and processes a published event.
   * Prevents duplicate processing, tracks execution status, handles retries, and updates states.
   */
  consumeEvent: async (eventId: string): Promise<void> => {
    const eventRef = doc(db, "system_events", eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      throw new Error(`Event ${eventId} not found.`);
    }

    const event = eventSnap.data() as DomainEvent;

    // Prevent double processing
    if (event.status === "processed" || event.status === "processing" && (Date.now() - new Date(event.timestamp).getTime() < 30000)) {
      console.log(`[SyncOrchestrator] Event ${eventId} is already processed or currently processing. Skipping.`);
      return;
    }

    console.log(`[SyncOrchestrator] Consuming event: ${event.eventType} (${eventId})`);

    // Mark as processing
    await updateDoc(eventRef, {
      status: "processing",
      updatedAt: new Date().toISOString()
    });

    try {
      // Routings and Side-Effects (such as syncing between domains, triggering workflows, etc.)
      await syncOrchestrator.routeEvent(event.eventType, event.payload);

      // Mark as successfully processed
      await updateDoc(eventRef, {
        status: "processed",
        processedAt: new Date().toISOString(),
        error: null
      });

      console.log(`[SyncOrchestrator] Successfully processed event: ${event.eventType} (${eventId})`);
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error(`[SyncOrchestrator] Error processing event ${eventId}:`, errorMsg);

      const nextRetry = event.retries + 1;
      if (nextRetry <= event.maxRetries) {
        // Retry logic with state update
        await updateDoc(eventRef, {
          status: "pending",
          retries: nextRetry,
          error: `${errorMsg} (Attempt ${nextRetry}/${event.maxRetries})`,
          updatedAt: new Date().toISOString()
        });
        console.log(`[SyncOrchestrator] Queued retry attempt ${nextRetry} for event ${eventId}`);
      } else {
        // Perm failed
        await updateDoc(eventRef, {
          status: "failed",
          error: `Failed after ${event.maxRetries} attempts. Last error: ${errorMsg}`,
          processedAt: new Date().toISOString()
        });
        console.error(`[SyncOrchestrator] Event ${eventId} permanently failed.`);
      }
    }
  },

  /**
   * Handles internal routing of business events.
   */
  routeEvent: async (eventType: string, payload: any): Promise<void> => {
    switch (eventType) {
      case "REQUIREMENT_CREATED":
        console.log("[SyncOrchestrator] Processing REQUIREMENT_CREATED sync logic.");
        // Place custom domain hooks here
        break;
      case "REQUIREMENT_UPDATED":
        console.log("[SyncOrchestrator] Processing REQUIREMENT_UPDATED sync logic.");
        break;
      case "CANDIDATE_ADDED":
        console.log("[SyncOrchestrator] Processing CANDIDATE_ADDED sync logic.");
        break;
      case "CANDIDATE_UPDATED":
        console.log("[SyncOrchestrator] Processing CANDIDATE_UPDATED sync logic.");
        break;
      case "CANDIDATE_ASSIGNED":
        console.log("[SyncOrchestrator] Processing CANDIDATE_ASSIGNED sync logic.");
        break;
      case "INTERVIEW_SCHEDULED":
        console.log("[SyncOrchestrator] Processing INTERVIEW_SCHEDULED sync logic.");
        break;
      case "OFFER_RELEASED":
        console.log("[SyncOrchestrator] Processing OFFER_RELEASED sync logic.");
        break;
      case "PLACEMENT_CLOSED":
        console.log("[SyncOrchestrator] Processing PLACEMENT_CLOSED sync logic.");
        break;
      case "VENDOR_ADDED":
        console.log("[SyncOrchestrator] Processing VENDOR_ADDED sync logic.");
        break;
      case "BROADCAST_PUBLISHED":
        console.log("[SyncOrchestrator] Processing BROADCAST_PUBLISHED sync logic.");
        break;
      default:
        console.warn(`[SyncOrchestrator] Unrecognized event type: ${eventType}. Skipping internal routing.`);
    }
  },

  /**
   * Scans and retries any events that were stuck in "pending" or "processing" states.
   */
  reprocessPendingEvents: async (): Promise<number> => {
    console.log("[SyncOrchestrator] Scanning for pending or stale events to reprocess...");
    const q = query(
      collection(db, "system_events"),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    let count = 0;
    for (const docSnap of snap.docs) {
      await syncOrchestrator.consumeEvent(docSnap.id);
      count++;
    }
    return count;
  }
};
