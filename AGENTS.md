# HireNest OS & CRM Governance Rules

## SYSTEM STATUS
**HireNest CRM RC-2**
Status: ADVANCED RC - GA STAGE PREPARATION

## Law 1: Company Ledger
- `system_events` is the **Company Ledger**.
- Properties: Append-only, Immutable, Timestamped, Auditable, Role Protected.
- Rules:
  - CREATE = allowed
  - READ = role based
  - UPDATE = denied
  - DELETE = denied
- Foundation for Revenue reporting, Activity timeline, AI context, Executive dashboards, and Compliance audits.

## Law 2: Single Source of Truth
- **Firebase** is the single source of truth.
- Everything derives from it: accounts, contacts, vendors, requirements, candidates, submissions, interviews, offers, placements, communications, followups, invoices, and system_events.
- No duplicate databases. No shadow business logic.

## Law 3: AI Governance
- NEVER enable AI automation until data stability and migration completion are proven.
- AI MAY: Analyze, Rank, Draft, Recommend, Forecast.
- AI MAY NOT: Send emails automatically, Modify revenue, Change candidate stages, Approve offers, or Escalate permissions without explicit Founder approval.
- AI outputs (outreach, engagement drafts, forecasts) belong in a review stage for Founder/Admin approval before dispatch.

## Law 4: Migration Protocol
- Governed cutover sequence:
    1. 72-hour soak test
    2. Phase 5 Read Cutover
    3. Phase 6 Write Cutover (Rollout: 10% -> 25% -> 50% -> 100%)
    4. 14-day bake period
    5. Supabase retirement
- Cutover Authorization relies STRICTLY on Data Evidence: 100% Parity across Records, Fields, Relationships, and Events.
- **Rollback Plan Required**: If parity < 100% OR Failed events > 0 OR Dashboard variance detected -> rollback to Supabase reads. Never migrate without rollback.
- Supabase acts as a read-only rollback system for at least 14 days post-cutover before decommissioning.

## Law 5: Domain-Driven Design & SSOT
- **Shared Firebase ≠ Shared Ownership.**
- **CRM Domain** owns: `crm_leads`, `crm_accounts`, `crm_contacts`, `crm_opportunities`, `crm_activities`, `crm_followups`, `crm_campaigns`, `crm_communications`. (CRM writes, OS reads).
- **OS Domain** owns: `clients`, `requirements`, `candidates`, `submissions`, `interviews`, `placements`, `vendors`, `deal_rooms`. (OS writes, CRM reads).
- **Shared Domain** owns: `system_events`, `audit_logs`, `workflow_instances`, `integration_mappings`.
- **Event-Driven Flow**: Domains NEVER write directly to each other's collections. They emit and react to `system_events`.
- **Database-Enforced Ownership**: Firestore security rules must enforce these boundaries.

## RC-1 Governance Rules (During Soak Test)
- **Allowed**: Bug fixes, Logging, Monitoring, Parity improvements, Performance tuning, Security hardening.
- **Forbidden**: New AI features, Schema changes, Collection renames, New integrations, UI redesigns, Vendor automation.
- Feature freeze protects migration integrity.

## HireNest v1.0 Architecture (Frozen)
- **HireNest CRM**: Commercial Command Center (Relationship Layer). Owns: `crm_leads`, `crm_accounts`, `crm_contacts`, `crm_vendor_accounts`, `crm_opportunities`, `crm_followups`, `crm_communications`, `crm_campaigns`.
- **HireNestOS**: Execution Engine (Fulfillment Layer). Owns: `requirements`, `candidates`, `submissions`, `interviews`, `offers`, `placements`, `deal_rooms`.
- **system_events**: Company Ledger (Event Fabric).
- **Firebase**: Enterprise SSOT.
- **Shared Domain**: `system_events`, `integration_mappings`, `audit_logs`, `workflow_instances`.
- **Workspace Provisioning**: No dual writes. Create Vendor/Client -> Create Firebase Auth User -> Emit `VENDOR_CREATED`/`CLIENT_CREATED` -> OS Listener Creates Workspace.

## Founder Principle
- **North Star**: "No Profile Left Behind". Every profile submitted must either become Feedback, Interview, Offer, Join, or Redeployment. No candidate should disappear into email threads.

## Executive Sprints & Execution Phase
- **Sprint 1: Gmail Ingestion Engine**: Highest ROI. Google Workspace Gmail API -> Pub/Sub Webhooks -> Cloud Functions -> Firestore -> `system_events`. Strict avoidance of browser-managed OAuth in favor of Server-Side Refresh Tokens and Service Account Processing. Collections: `gmail_connections`, `gmail_messages`, `email_threads`, `attachments`.
- **Sprint 2: Vendor Excel Parser**: Intercept Vendor emails -> Parse attachment -> Extract Candidates -> Auto-create `submission_batches`, `candidate_submissions`, `candidate_feedback` mapped to Vendor and Client Requirements -> Create Follow-up -> Generate Event.
- **Sprint 3: Feedback SLA Engine**: Deterministic rules. 3 Days -> Reminder. 7 Days -> Escalation. 10 Days -> Founder Alert. Generates events: `CLIENT_DELAYED`, `FOLLOWUP_REQUIRED`, `REVENUE_BLOCKED`. Dashboard tracks pending feedback, average delay, and revenue blocked.
- **Sprint 4: Candidate Redeployment Engine**: High ROI focus. Detect candidates waiting > 5 Days with > 85% match score for other requirements -> Auto-suggest alternate deployment -> Founder approves -> Resubmit. Converts idle inventory into revenue.

## Vendor Intelligence Agent
- Represents a BDM. Reads Gmail, identifies Vendor/Client/Requirement, counts profiles shared, tracks feedback status, schedules follow-ups, escalates delays, suggests redeployment.
- **Crucial Flow**: Agent proposes -> Founder approves -> System executes.

## Memanto Integration Strategy
- Delay implementation until base workflows are rock solid. Use cases: Vendor Relationship Memory, Client History, Conversation Memory, Follow-up Context, Account Intelligence (Not as the transaction engine).

## Production Readiness Checklist (Pre-Gmail Automation)
- [x] Firebase migration complete (Firestore SSOT active & unified)
- [x] Phase 5 read cutover complete (Verified with 100% telemetry validation)
- [x] Phase 6 write cutover complete (Multi-tenant isolation active)
- [ ] Gmail OAuth server-side only
- [ ] Refresh tokens encrypted
- [ ] Event idempotency enabled
- [x] `system_events` immutable (Enforced via Firestore Security Rules - Law 1)
- [x] Role-based access enforced (Claim-aware custom token structure active)
- [ ] Disaster recovery tested
- [ ] Replay tests successful


## UI/UX Philosophy
- Clean, minimal, high-contrast layouts.
- Always include an Executive View (Business Health Score) for the Admin/Founder roles.
- Actions create events. Events create timelines. Timelines create intelligence.
