# HireNest CRM 2.0 - App & Data Flow

## 1. High-Level Commercial Flow
1. **Creation:** Account Manager creates a new `Account` -> `Contact`.
2. **Execution Request:** Contact requests a hire -> Account Manager opens a `Requirement` in CRM.
3. **OS Hand-off:** Requirement syncs to HireNestOS execution engine.
4. **OS Action:** OS parses requirement, leverages AI for alignment, matches Candidates, notifies Vendors.
5. **Event Generation:** OS events (Vendor Submission, Candidate Interviewed) fire across Event Bus.
6. **CRM Reception:** CRM parses events; pushes them to Account Timeline and Communication Center.
7. **Revenue Shift:** Requirement status shifts forward in CRM Revenue Pipeline.
8. **Follow-Up Trigger:** CRM drops follow-ups into the Follow-Up queues.

## 2. Notification & Communication Flow
- **Inbound Comms:** Vendor replies on WhatsApp -> Processed via webhook -> Directed into `CommunicationCenter`.
- **Alert Processing:** Communication triggers update on Dashboard.
- **Outbound Actions:** Account Manager opens `CommunicationCenter` -> Replies contextually on same thread (Email or WhatsApp).

## 3. Follow-Up State Machine
1. Standard requirement untouched for 3 days -> CRM generates `Follow-Up: Vendor Supply Review`.
2. Submission untouched for 2 days -> CRM generates `Follow-Up: Client Feedback Req`.
3. Offer sent -> CRM generates `Follow-Up: Offer Acceptance Verification`.
4. Placed -> CRM generates `Follow-Up: Initial Invoice Trigger`.

## 4. Dashboard View Flow
- Top level components pull aggregates from `accounts`, `requirements`, and `revenue_pipeline`.
- Widgets pull explicitly from `.where(status = active)` or equivalent.
- Follow-up cards pull from `followups.where(is_completed = false)`.
