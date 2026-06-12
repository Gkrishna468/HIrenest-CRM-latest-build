# HireNest Firebase Data Model

This document outlines the Firebase (Firestore) data model for both HireNestOS and HireNest CRM, acting as a single source of truth.

## Shared Collections

### 1. `accounts`
Represents the core business units, clients, or prospects.
```json
{
  "id": "string (UUID)",
  "companyName": "string",
  "industry": "string",
  "status": "string (e.g., active, prospect, inactive)",
  "ownerId": "string (User ID)"
}
```

### 2. `contacts`
Represents individuals associated with an Account.
```json
{
  "id": "string (UUID)",
  "accountId": "string (Reference to accounts.id)",
  "name": "string",
  "designation": "string",
  "email": "string",
  "phone": "string"
}
```

### 3. `vendors`
Represents third-party agencies or partners.
```json
{
  "id": "string (UUID)",
  "companyName": "string",
  "tier": "string (e.g., gold, silver)",
  "responseRate": "number",
  "performanceScore": "number"
}
```

### 4. `requirements`
Represents job orders, requisitions, or roles to be filled.
```json
{
  "id": "string (UUID)",
  "accountId": "string (Reference to accounts.id)",
  "title": "string",
  "status": "string (e.g., open, closed, on-hold)",
  "priority": "string (e.g., high, medium, low)"
}
```

### 5. `system_events`
An immutable ledger of every action across both HireNestOS and HireNest CRM. Used for Timeline, Reports, Revenue generation, and automated Follow-ups.
```json
{
  "id": "string (UUID)",
  "eventType": "string (e.g., REQUIREMENT_CREATED, SUBMISSION_MADE)",
  "entityType": "string (e.g., requirement, candidate, vendor)",
  "entityId": "string (UUID of the associated entity)",
  "actorId": "string (User ID or system)",
  "timestamp": "ISO-8601 string",
  "metadata": "object (optional payloads)"
}
```

### 6. Additional Anticipated Collections
- `candidates`
- `submissions`
- `interviews`
- `offers`
- `placements`
- `invoices`
- `communications`
- `followups`
- `tasks`
- `users`
