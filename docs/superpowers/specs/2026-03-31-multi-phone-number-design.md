# Multi-Phone-Number Conversation Filter

**Date:** 2026-03-31
**Status:** Approved

## Overview

When AIVA operates with multiple system phone numbers, the WebUI must allow the user to select which system number to view conversations for. System phone numbers are derived dynamically from the database — no static configuration required.

## API Changes

### New endpoint: `GET /messages/system-phones`

Returns a sorted list of distinct system-side phone numbers derived from message history.

**Response:** `string[]`

A "system phone" is defined as:
- `receiver` on inbound messages
- `sender` on outbound messages

**Repository query (`findSystemPhones`):**
```sql
SELECT DISTINCT CASE WHEN direction = 'inbound' THEN receiver ELSE sender END AS phone
FROM messages
ORDER BY phone
```

### Updated: `GET /messages/conversations`

Gains an optional `?systemPhone=` query param. When provided, filters conversations to only those involving that system phone number.

The filter applies within the existing dedup query — only rows where `receiver = systemPhone` (inbound) or `sender = systemPhone` (outbound) are included.

### Updated: `GET /messages`

Gains an optional `?systemPhone=` query param. When provided, adds a condition scoping results to messages where the system phone is one of the two participants, combined with the existing `?phone=` filter (contact side).

Effectively: `WHERE (sender = contactPhone OR receiver = contactPhone) AND (sender = systemPhone OR receiver = systemPhone)`

### Validation

`systemPhone` is validated as a non-empty string in `listMessagesSchema`, following the same pattern as the existing `phone` param.

## Module Changes (API)

**`repository.ts`:**
- Add `findSystemPhones(): Promise<string[]>`
- Add `systemPhone?: string` to `MessagesFilter` and apply it in `findMany()`
- Add `systemPhone?: string` param to `findConversations()` and apply it in the query

**`service.ts`:**
- Add `listSystemPhones()` delegating to `repository.findSystemPhones()`
- Thread `systemPhone` through `list()` and `listConversations()`

**`controller.ts`:**
- Add `listSystemPhones` handler for `GET /messages/system-phones`
- Read `systemPhone` from `req.query` in `list` and `listConversations` handlers

**`routes.ts`:**
- Register `GET /messages/system-phones` before the `GET /:id` route to avoid param collision

**`validation.ts`:**
- Add optional `systemPhone` string to `listMessagesSchema`

## WebUI Changes

### `api.ts`

- Add `getSystemPhones(): Promise<string[]>` — fetches `GET /messages/system-phones`
- Update `getConversations(systemPhone?: string)` — appends `?systemPhone=` when provided
- Update `getMessages(phone?: string, systemPhone?: string)` — appends `&systemPhone=` when provided

### `+page.svelte`

New state:
- `systemPhones: string[]` — populated on mount
- `selectedSystemPhone: string | null` — active filter; auto-set to the single phone if only one exists

On mount, fetch `getSystemPhones()` first, auto-select if exactly one result, then fetch `getConversations(selectedSystemPhone)`. Two sequential calls — system phones resolves quickly and must be known before conversations are fetched with the correct filter.

When the user changes the dropdown selection:
1. Update `selectedSystemPhone`
2. Re-fetch conversations with the new filter
3. Clear the active conversation and messages

When fetching messages for a conversation, pass `selectedSystemPhone` alongside the contact phone.

### `ConversationList.svelte`

Add props:
- `systemPhones: string[]`
- `selectedSystemPhone: string | null`
- `onsystemphonechange: (phone: string) => void`

Render a `<select>` dropdown above the search input when `systemPhones.length > 1`. Phone numbers are formatted using the existing `formatPhoneNumber` utility. Hidden (not rendered) when there is only one system phone.

## Error Handling & Edge Cases

- If `GET /messages/system-phones` fails, the UI falls back to fetching conversations without a system phone filter (same behavior as today). No error is surfaced to the user for this failure.
- If an invalid `systemPhone` is passed to the API, the query naturally returns an empty result — no special error needed.
- When there is only one system phone, the dropdown is not rendered and the phone is applied silently.
- No changes to voice/SMS webhook flows — they always have explicit `to`/`from` numbers.
