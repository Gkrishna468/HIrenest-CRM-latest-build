# HireNest OS & CRM Governance Rules

## SYSTEM STATUS
**HireNest CRM RC-1**
Status: FROZEN

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

## Phase 7 & 8 Vision: Revenue Intelligence Engine
- **Core Principle**: Vendor -> Submission -> Client Feedback -> SLA Tracking -> Follow-up Automation -> Redeployment -> Revenue.
- **North Star**: Every profile submitted must either become Feedback, Interview, Offer, Join, or Redeployment. No candidate should disappear into email threads.
- **Gmail Integration Architecture**: Must use Server-side OAuth, Refresh Tokens, and Firebase Cloud Functions (via Pub/Sub push notifications - no browser OAuth for background syncs). Data flows to `gmail_connections`, `gmail_messages`.
- **Sprint 2 — Excel Parser**: Intercept Vendor emails -> Parse attachment (Name, Skill, Exp, Location, CTC, Notice Period) -> Auto-create `candidate_profiles`, `submission_batches`, `candidate_submissions` mapped to Vendor and Client Requirements.
- **Sprint 3 — Follow-Up Engine**: Deterministic rules (e.g. Feedback > 3 days -> Draft Email -> Notify Founder. Feedback > 7 days -> Escalate High Priority).
- **Vendor & Client Analytics**: Track conversion gaps inside OS Vendor Workspaces.
- **Candidate Redeployment Engine**: Detect candidates waiting > 5 Days with > 85% match score for other requirements -> Auto-generate alternate deployment suggestions -> Founder approves -> Resubmit. Converts idle inventory into revenue.
- **Workspace Provisioning**: No dual writes. Create Vendor/Client -> Create Firebase Auth User -> Emit `VENDOR_CREATED`/`CLIENT_CREATED` -> OS Listener Creates Workspace.
- **Memanto Integration Strategy**: Implement only after workflows are stable. Use cases: Vendor Relationship Memory, Client History, Conversation Memory, Follow-up Context, Account Intelligence.
- **New Collections**: `gmail_connections`, `submission_batches`, `candidate_submissions`, `client_feedback`, `vendor_scorecards`, `candidate_redeployment`, `feedback_sla`, `revenue_forecast`.

## Architecture Verdict
- **HireNest CRM**: Commercial Command Center (Relationship Layer)
- **HireNestOS**: Execution Engine (Fulfillment Layer)
- **system_events**: Company Ledger (Event Fabric)
- **Firebase**: Enterprise SSOT

## UI/UX Philosophy
- Clean, minimal, high-contrast layouts.
- Always include an Executive View (Business Health Score) for the Admin/Founder roles.
- Actions create events. Events create timelines. Timelines create intelligence.
