import { Firestore } from "firebase-admin/firestore";

export class EventBus {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Publish an event to the system_events ledger.
   */
  async publish(event: string, payload: any, source: string = "system") {
    const docData = {
      event,
      payload,
      source,
      status: "pending",
      timestamp: new Date().toISOString(),
    };
    
    const ref = await this.db.collection("system_events").add(docData);
    console.log(`[EventBus] Published event: ${event} (${ref.id})`);
    return ref.id;
  }
}
