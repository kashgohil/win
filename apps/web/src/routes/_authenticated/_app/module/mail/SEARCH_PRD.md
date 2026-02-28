# Mail Search — Product Requirements

## Core Search Capabilities

### 1. Full-text search

Search across `subject`, `snippet`, `bodyPlain`, `fromName`, `fromAddress`.

### 2. Scoped filters (combinable with each other)

| Filter             | What it does                                                                  |
| ------------------ | ----------------------------------------------------------------------------- |
| **From**           | Match `fromAddress` or `fromName` — e.g., `from:jane@acme.com` or `from:Jane` |
| **To / CC**        | Match `toAddresses` or `ccAddresses`                                          |
| **Subject**        | Match only in `subject` field                                                 |
| **Category**       | Filter by `category` (urgent, actionable, newsletter, receipt, etc.)          |
| **Has attachment** | Filter `hasAttachments: true`                                                 |
| **Starred**        | Filter `isStarred: true`                                                      |
| **Read / Unread**  | Filter by `isRead`                                                            |
| **Date range**     | Emails received before/after/between dates                                    |
| **Label**          | Match against `labels[]` array                                                |

### 3. Smart operators (Gmail-style syntax)

```
from:john subject:invoice after:2026-01-01 has:attachment
"exact phrase match"
category:receipt is:unread
```

## UX Recommendations

### 4. Search bar placement

Persistent in the inbox header, always accessible. `Cmd+K` / `Ctrl+K` shortcut to focus it.

### 5. Recent searches

Store last 5-10 searches locally for quick re-access.

### 6. Search suggestions / autocomplete

As the user types, suggest:

- Known sender addresses/names (from existing emails)
- Filter chips (`from:`, `has:attachment`, `is:starred`, etc.)
- Categories as pills

### 7. Filter chips UI

Parsed filters render as removable chips below the search bar (like Gmail). Clicking a chip edits it, `x` removes it. This makes complex queries feel simple.

### 8. Zero-state

When search box is empty and focused, show:

- Recent searches
- Suggested filters ("Has attachments", "Starred", category shortcuts)

### 9. Inline results

Results should look like the inbox list (reuse `EmailRow`) with the **matching terms highlighted** in snippet/subject.

### 10. Result count

Show total matches (e.g., "23 results for 'invoice'").

## Technical Considerations

### 11. Where to search

| Approach                                       | Pros                                         | Cons                          |
| ---------------------------------------------- | -------------------------------------------- | ----------------------------- |
| **PostgreSQL `tsvector` / full-text search**   | No new infra, good enough for most mailboxes | Slower on very large datasets |
| **Dedicated search (Meilisearch / Typesense)** | Fast, typo-tolerant, faceted                 | Extra service to run          |

For current scale, **Postgres full-text search** is the pragmatic choice. Can add a dedicated search index later if needed.

### 12. API shape

Single endpoint:

```
GET /mail/emails/search?q=invoice&from=jane@acme.com&category=receipt&after=2026-01-01&has_attachment=true&page=1
```

The `q` param handles free-text; named params handle structured filters. The backend parses a combined query string like `from:john invoice` into both.

### 13. Debounced search

300ms debounce on keystroke, with loading indicator.

### 14. Pagination

Cursor-based pagination on results (consistent with existing infinite scroll pattern).

## Versioning

### v1 — Core search

1. Free-text search across subject + snippet + fromName + fromAddress
2. Filter chips for category, read/unread, starred, has attachment
3. `from:` filter with autocomplete from known senders
4. Date range picker
5. `Cmd+K` shortcut + recent searches

### v2 — Advanced

1. Gmail-style query syntax parsing (`from:`, `subject:`, `after:`, etc. in the search bar)
2. To/CC filters
3. Label filters
4. Search within email body (full `bodyPlain` full-text search)
5. Saved searches
