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

## RC-1 Governance Rules (During Soak Test)
- **Allowed**: Bug fixes, Logging, Monitoring, Parity improvements, Performance tuning, Security hardening.
- **Forbidden**: New AI features, Schema changes, Collection renames, New integrations, UI redesigns, Vendor automation.
- Feature freeze protects migration integrity.

## UI/UX Philosophy
- Clean, minimal, high-contrast layouts.
- Always include an Executive View (Business Health Score) for the Admin/Founder roles.
- Actions create events. Events create timelines. Timelines create intelligence.
