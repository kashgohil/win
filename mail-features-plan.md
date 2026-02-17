# Mail Module — Future Features Plan

All features below need additional backend work and are out of scope for the 4 core screens (Hub, Inbox, Email Detail, Settings). This document captures them in detail so they can be picked up next.

---

## Analytics & Insights

Needs new aggregation API endpoints.

### Email Volume Heatmap

- Patterns by hour/day of when mail arrives
- Grid visualization: 7 rows (days) × 24 cols (hours), color-coded by volume
- Backend: `GET /mail/analytics/volume` — aggregated email counts grouped by hour+weekday

### Category Breakdown

- Pie/bar chart of email categories over time
- Example insight: "62% of your email is newsletters"
- Backend: `GET /mail/analytics/categories` — counts per category over configurable time range

### Response Time Tracking

- How fast you respond to urgent vs. other emails
- Median/p90 response times broken down by category and priority
- Backend: `GET /mail/analytics/response-times` — requires tracking when replies are sent

### Top Senders

- Who emails you the most, grouped by category
- Useful for identifying noise sources
- Backend: `GET /mail/analytics/senders` — top N senders with category breakdown

### Unsubscribe Suggestions

- "47 emails from this sender, 0 opened. Unsubscribe?"
- Identify senders with high volume + low engagement
- Backend: `GET /mail/analytics/unsubscribe-candidates` — senders with high send count, low open rate

---

## Smart Actions

Needs new backend endpoints + UI.

### Batch Triage

- Sweep actions: "Archive all 12 newsletters", "Dismiss all informational"
- UI: Grouped triage view with batch action buttons
- Backend: `POST /mail/triage/batch` — accepts array of triage item IDs + action

### Snooze Dashboard

- View/manage snoozed items, re-triage when they wake up
- List all items with `status: "snoozed"` and their `snoozedUntil` times
- Backend: `GET /mail/triage?status=snoozed` — filtered triage list

### Draft Review Queue

- All AI-drafted responses in one place, edit/approve/send in bulk
- Shows draft text alongside original email context
- Backend: `GET /mail/drafts` — triage items with `draftResponse` populated

### Rules Editor

- User-defined auto-handle rules ("Always archive from domain X")
- CRUD interface for rules with conditions (sender, domain, subject, category) and actions
- Backend: `POST/GET/PUT/DELETE /mail/rules` — new `mail_rules` table

---

## Cross-Module Intelligence

Needs cross-module API integration.

### Email-to-Task

- One click to create a task from an email (links to task module)
- Pre-fills task title from email subject, description from AI summary
- Backend: `POST /mail/emails/:id/create-task` — creates task and links via `sourceModule`

### Contact Enrichment Panel

- CRM context when viewing an email (relationship score, last interaction, deal status)
- Side panel in email detail view with CRM data for the sender
- Backend: `GET /crm/contacts/by-email/:email` — lookup contact by email address

### Financial Extraction

- Detect amounts, invoice numbers, due dates in receipts
- Surface to finance module automatically
- Backend: AI processing step in mail worker — extract structured financial data, push to fin module

### Calendar Detection

- Detect dates/times in emails, offer to create calendar events
- Inline action in email detail: "Create event for March 15 at 2pm"
- Backend: `POST /mail/emails/:id/create-event` — parses detected date, creates calendar event

---

## UX Enhancements

Frontend-only (can be added incrementally), unless noted.

### Keyboard Shortcuts

- `j`/`k` navigation through email list
- `e` to archive, `r` to reply, `#` to dismiss
- `?` to show shortcuts help overlay
- Frontend only — add `useEffect` keyboard listener in Inbox and Detail views

### Search

- Full-text across subject, sender, snippet, AI summary
- Search bar in inbox with debounced input
- Backend: `GET /mail/emails/search?q=query` — full-text search endpoint (needs pg_trgm or similar)

### Thread Grouping

- Collapse emails by `providerThreadId`
- Show thread count badge, expand to see all messages in thread
- Backend: `GET /mail/threads` — aggregate emails by thread ID, return thread-level metadata

### Star/Read Toggles

- Toggle `isStarred` and `isRead` from inbox list
- Optimistic UI updates
- Backend: `PATCH /mail/emails/:id` — partial update for `isStarred`, `isRead`

### Infinite Scroll

- Replace "Load more" pagination with intersection observer
- Append new pages as user scrolls to bottom
- Frontend only — use `useInfiniteQuery` + `IntersectionObserver`

### Real-time Updates

- WebSocket integration for live email arrivals
- New emails slide in at top of inbox
- Backend: WebSocket endpoint or SSE at `/mail/stream` — push new email events

### Notification Preferences

- Per-category notification settings
- Example: urgent → push notification, newsletter → daily digest only
- Backend: `GET/PUT /mail/notification-preferences` — new `mail_notification_prefs` table
