# Multi-Phone-Number Conversation Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the WebUI to filter conversations and messages by system phone number when multiple system numbers exist, with the active number selected via a dropdown.

**Architecture:** System phones are derived from the DB at runtime. The API gains a `systemPhone` query param on `/messages` and `/messages/conversations`, plus a new `GET /messages/system-phones` endpoint. The WebUI fetches system phones on mount, auto-selects if only one, and passes the selection through all subsequent API calls. The dropdown is hidden when there is only one system phone.

**Tech Stack:** Bun + Express 5 + TypeScript (API), Zod validation, Bun's native `sql` tagged template client, SvelteKit 2 + Svelte 5 runes + Tailwind/DaisyUI (WebUI).

---

## File Map

**Modified (API):**
- `api/app/modules/message/repository.ts` — add `findSystemPhones()`, update `MessagesFilter` + `findMany()`, update `findConversations()`
- `api/app/modules/message/service.ts` — add `listSystemPhones()`, thread `systemPhone` through `list()` and `listConversations()`
- `api/app/modules/message/controller.ts` — add `listSystemPhones` handler, read `systemPhone` from query in `list` and `listConversations`
- `api/app/modules/message/routes.ts` — register `GET /messages/system-phones`, add validation to conversations route
- `api/app/modules/message/validation.ts` — add `systemPhone` to `listMessagesSchema`
- `api/test/routes.test.ts` — add mocks and tests for new endpoint and filter params

**Modified (WebUI):**
- `webui/src/lib/api.ts` — add `getSystemPhones()`, update `getConversations()` and `getMessages()` signatures
- `webui/src/routes/+page.svelte` — add `systemPhones`/`selectedSystemPhone` state, mount logic, change handler, render dropdown directly in sidebar
- `webui/src/lib/ConversationList.svelte` — no prop changes needed (dropdown lives in page.svelte)

---

### Task 1: Write failing API tests for system phones and systemPhone filter

**Files:**
- Modify: `api/test/routes.test.ts`

- [ ] **Step 1: Add mocks for new repository functions**

In `api/test/routes.test.ts`, add two new mocks alongside the existing ones at the top of the file (before `mock.module`):

```typescript
const mockFindSystemPhones = mock(() => Promise.resolve<string[]>([]));
const mockFindConversations = mock(() => Promise.resolve([]));
```

Then inside the `mock.module("../app/modules/message/repository", ...)` call, add these two entries:

```typescript
mock.module("../app/modules/message/repository", () => ({
  create: mockCreate,
  findMany: mockFindMany,
  findConversation: mockFindConversation,
  findById: mock(() => Promise.resolve(undefined)),
  getMessagesByPhone: mock(() => Promise.resolve([])),
  findSystemPhones: mockFindSystemPhones,
  findConversations: mockFindConversations,
}));
```

Also add `mockFindSystemPhones.mockClear()` and `mockFindConversations.mockClear()` in the `beforeEach` block.

- [ ] **Step 2: Add test for GET /messages/system-phones**

Add a new `describe` block after the existing `GET /messages` block:

```typescript
describe("GET /messages/system-phones", () => {
  it("should return list of system phone numbers", async () => {
    mockFindSystemPhones.mockResolvedValueOnce(["+15559876543", "+15550001111"]);

    const response = await fetch(`${baseUrl}/messages/system-phones`);
    const data = (await response.json()) as string[];

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(data).toEqual(["+15559876543", "+15550001111"]);
    expect(mockFindSystemPhones).toHaveBeenCalled();
  });

  it("should return empty array when no messages exist", async () => {
    mockFindSystemPhones.mockResolvedValueOnce([]);

    const response = await fetch(`${baseUrl}/messages/system-phones`);
    const data = (await response.json()) as string[];

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 3: Add test for systemPhone filter on GET /messages**

Add inside the existing `describe("GET /messages", ...)` block:

```typescript
it("should pass systemPhone filter to repository", async () => {
  mockFindMany.mockResolvedValueOnce([]);

  await fetch(`${baseUrl}/messages?systemPhone=%2B15559876543`);

  expect(mockFindMany).toHaveBeenCalledWith(
    expect.objectContaining({ systemPhone: "+15559876543" }),
  );
});
```

- [ ] **Step 4: Add test for systemPhone filter on GET /messages/conversations**

Add a new `describe` block:

```typescript
describe("GET /messages/conversations", () => {
  it("should return conversations", async () => {
    mockFindConversations.mockResolvedValueOnce([]);

    const response = await fetch(`${baseUrl}/messages/conversations`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(mockFindConversations).toHaveBeenCalledWith(undefined);
  });

  it("should pass systemPhone to repository when provided", async () => {
    mockFindConversations.mockResolvedValueOnce([]);

    await fetch(`${baseUrl}/messages/conversations?systemPhone=%2B15559876543`);

    expect(mockFindConversations).toHaveBeenCalledWith("+15559876543");
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd api && bun test test/routes.test.ts
```

Expected: failures like `404` for `/messages/system-phones`, and `mockFindSystemPhones`/`mockFindConversations` not being called as expected.

---

### Task 2: Implement repository changes

**Files:**
- Modify: `api/app/modules/message/repository.ts`

- [ ] **Step 1: Add `findSystemPhones()`**

Add this function after the `findById` function:

```typescript
/**
 * Get distinct system-side phone numbers from message history.
 * System phone = receiver on inbound, sender on outbound.
 */
export async function findSystemPhones(): Promise<string[]> {
  const rows = await sql<{ phone: string }[]>`
    SELECT DISTINCT
      CASE WHEN direction = 'inbound' THEN receiver ELSE sender END AS phone
    FROM messages
    ORDER BY phone
  `;
  return rows.map((r) => r.phone);
}
```

- [ ] **Step 2: Update `MessagesFilter` and `findMany()`**

Replace the existing `MessagesPhoneFilter` / `MessagesFilter` types and `findMany` function:

```typescript
export type MessagesPhoneFilter = {
  phone?: string;
  systemPhone?: string;
};
export type MessagesFilter = MessagesPhoneFilter;

export async function findMany(
  filter: MessagesFilter = {},
): Promise<Message[]> {
  let f = sql``;
  if (filter.phone && filter.systemPhone) {
    f = sql`
      WHERE (sender = ${filter.phone} OR receiver = ${filter.phone})
        AND (sender = ${filter.systemPhone} OR receiver = ${filter.systemPhone})
    `;
  } else if (filter.phone) {
    f = sql`
      WHERE sender = ${filter.phone}
         OR receiver = ${filter.phone}
    `;
  } else if (filter.systemPhone) {
    f = sql`
      WHERE sender = ${filter.systemPhone}
         OR receiver = ${filter.systemPhone}
    `;
  }
  return sql`
    SELECT *
    FROM messages
    ${f}
    ORDER BY created DESC
  `;
}
```

- [ ] **Step 3: Update `findConversations()` to accept `systemPhone`**

Replace the existing `findConversations` function:

```typescript
export async function findConversations(
  systemPhone?: string,
): Promise<Conversation[]> {
  const f = systemPhone
    ? sql`
        WHERE (direction = 'inbound' AND receiver = ${systemPhone})
           OR (direction = 'outbound' AND sender = ${systemPhone})
      `
    : sql``;
  return sql`
    SELECT DISTINCT ON (LEAST(sender, receiver), GREATEST(sender, receiver))
      LEAST(sender, receiver) as phone1,
      GREATEST(sender, receiver) as phone2,
      body as last_message_body,
      sender as last_message_sender,
      created as last_message_at,
      CASE WHEN direction = 'inbound' THEN sender ELSE receiver END as contact_phone
    FROM messages
    ${f}
    ORDER BY LEAST(sender, receiver), GREATEST(sender, receiver), created DESC
  `;
}
```

- [ ] **Step 4: Run type check**

```bash
cd api && bun type-check
```

Expected: no errors.

---

### Task 3: Implement validation, service, controller, routes — make tests pass

**Files:**
- Modify: `api/app/modules/message/validation.ts`
- Modify: `api/app/modules/message/service.ts`
- Modify: `api/app/modules/message/controller.ts`
- Modify: `api/app/modules/message/routes.ts`

- [ ] **Step 1: Update `listMessagesSchema` in `validation.ts`**

Replace the existing `listMessagesSchema`:

```typescript
export const listMessagesSchema = {
  query: z.object({
    phone: z.string().optional(),
    systemPhone: z.string().optional(),
  }),
};
```

- [ ] **Step 2: Update `service.ts`**

Add `listSystemPhones` and thread `systemPhone` through existing functions. Replace the file content:

```typescript
import { NotFoundError } from "../../shared/errors";
import { smsCompletion } from "../llm/completions";
import { repository, type Conversation, type Message } from ".";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "message:service" });

export async function create(
  input: repository.CreateMessageInput,
): Promise<Message> {
  return repository.create(input);
}

export type ListMessagesFilter = repository.MessagesFilter;

export async function list(
  filter: ListMessagesFilter = {},
): Promise<Message[]> {
  return repository.findMany(filter);
}

export async function getById(id: number): Promise<Message> {
  const message = await repository.findById(id);
  if (!message) {
    throw new NotFoundError(`Message with id ${id} not found`);
  }
  return message;
}

export async function listConversations(
  systemPhone?: string,
): Promise<Conversation[]> {
  return repository.findConversations(systemPhone);
}

export async function listSystemPhones(): Promise<string[]> {
  return repository.findSystemPhones();
}

export async function replyToMessage(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  logger.debug({ from, length: body.length }, "replyToMessage");
  const conversation = await repository.createInboundAndFetchConversation(
    from,
    to,
    body,
  );
  logger.debug(
    { count: conversation.length },
    "replyToMessage: conversation history",
  );
  const llmResponse = await smsCompletion.create(
    conversation.map((msg) => ({
      role: msg.direction === "outbound" ? "assistant" : "user",
      content: msg.body,
    })),
  );
  logger.debug({ length: llmResponse.length }, "replyToMessage: LLM response");
  await repository.create({
    body: llmResponse,
    receiver: from,
    sender: to,
    direction: "outbound",
  });
  return llmResponse;
}
```

- [ ] **Step 3: Update `controller.ts`**

Replace the file content:

```typescript
import type { RequestHandler } from "express";
import * as service from "./service";

export const list: RequestHandler = async (req, res) => {
  const phone = req.query.phone as string | undefined;
  const systemPhone = req.query.systemPhone as string | undefined;
  const messages = await service.list({ phone, systemPhone });
  res.json(messages);
};

export const getById: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const message = await service.getById(id);
  res.json(message);
};

export const create: RequestHandler = async (req, res) => {
  const message = await service.create(req.body);
  res.status(201).json(message);
};

export const listConversations: RequestHandler = async (req, res) => {
  const systemPhone = req.query.systemPhone as string | undefined;
  const conversations = await service.listConversations(systemPhone);
  res.json(conversations);
};

export const listSystemPhones: RequestHandler = async (_req, res) => {
  const phones = await service.listSystemPhones();
  res.json(phones);
};
```

- [ ] **Step 4: Update `routes.ts`**

Replace the file content (note: `system-phones` and `conversations` must be registered before `/:id`):

```typescript
import { Router } from "express";
import { validate } from "../../shared/middleware";
import * as controller from "./controller";
import {
  listMessagesSchema,
  messageIdSchema,
  createMessageSchema,
} from "./validation";

const router = Router();

router.get("/", validate(listMessagesSchema), controller.list);
router.post("/", validate(createMessageSchema), controller.create);
router.get("/system-phones", controller.listSystemPhones);
router.get(
  "/conversations",
  validate(listMessagesSchema),
  controller.listConversations,
);
router.get("/:id", validate(messageIdSchema), controller.getById);

export default router;
```

- [ ] **Step 5: Run tests**

```bash
cd api && bun test test/routes.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Run type check**

```bash
cd api && bun type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add api/app/modules/message/repository.ts \
        api/app/modules/message/service.ts \
        api/app/modules/message/controller.ts \
        api/app/modules/message/routes.ts \
        api/app/modules/message/validation.ts \
        api/test/routes.test.ts
git commit -m "feat: add system phone filter to messages API"
```

---

### Task 4: Update WebUI API client

**Files:**
- Modify: `webui/src/lib/api.ts`

- [ ] **Step 1: Add `getSystemPhones` and update existing functions**

Replace the file content:

```typescript
export type Direction = 'inbound' | 'outbound';

export type Message = {
  id: number;
  receiver: string;
  sender: string;
  body: string;
  direction: Direction;
  created: Date;
};

export type Conversation = {
  phone1: string;
  phone2: string;
  last_message_body: string;
  last_message_sender: string;
  last_message_at: string;
  contact_phone: string;
};

export async function getSystemPhones(): Promise<string[]> {
  const response = await fetch(`/messages/system-phones`);
  if (!response.ok) {
    throw new Error(`Failed to fetch system phones: ${response.status}`);
  }
  return response.json();
}

export async function getMessages(
  phone?: string,
  systemPhone?: string,
): Promise<Message[]> {
  const params = new URLSearchParams();
  if (phone) params.set('phone', phone);
  if (systemPhone) params.set('systemPhone', systemPhone);
  const qs = params.toString();
  const response = await fetch(`/messages${qs ? `?${qs}` : ''}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }
  return response.json();
}

export async function getConversations(systemPhone?: string): Promise<Conversation[]> {
  const params = systemPhone
    ? `?systemPhone=${encodeURIComponent(systemPhone)}`
    : '';
  const response = await fetch(`/messages/conversations${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }
  return response.json();
}
```

- [ ] **Step 2: Run WebUI type check**

```bash
cd webui && bun check
```

Expected: no errors (the page.svelte will show errors until Task 5, that's fine — or run `bun check` scoped to `src/lib/api.ts` only by checking for compile errors manually).

---

### Task 5: Update +page.svelte with system phone state, logic, and dropdown

The dropdown lives directly in `+page.svelte` (not inside `ConversationList`) so it renders even when conversations is empty — e.g., when a system number has no messages yet, the user can still switch to another.

**Files:**
- Modify: `webui/src/routes/+page.svelte`

- [ ] **Step 1: Replace file content**

```svelte
<script lang="ts">
  import {
    getSystemPhones,
    getConversations,
    getMessages,
    type Conversation,
    type Message,
  } from '$lib/api';
  import { formatPhoneNumber } from '$lib/utils';
  import { onMount } from 'svelte';
  import ConversationList from '$lib/ConversationList.svelte';
  import ConversationView from '$lib/ConversationView.svelte';
  import ErrorIcon from '$lib/icons/ErrorIcon.svelte';

  let systemPhones: string[] = $state([]);
  let selectedSystemPhone: string | null = $state(null);
  let conversations: Conversation[] = $state([]);
  let messages: Message[] = $state([]);
  let loading = $state(true);
  let messagesLoading = $state(false);
  let error: unknown = $state(null);
  let selectedPhone: string | null = $state(null);

  onMount(async () => {
    try {
      systemPhones = await getSystemPhones();
      if (systemPhones.length >= 1) {
        selectedSystemPhone = systemPhones[0];
      }
    } catch (err) {
      console.error('Failed to fetch system phones', err);
      // fall through — selectedSystemPhone stays null, load all conversations
    }
    try {
      conversations = await getConversations(selectedSystemPhone ?? undefined);
    } catch (err) {
      console.error(err);
      error = err;
    } finally {
      loading = false;
    }
  });

  async function selectSystemPhone(phone: string) {
    selectedSystemPhone = phone;
    selectedPhone = null;
    messages = [];
    loading = true;
    error = null;
    try {
      conversations = await getConversations(phone);
    } catch (err) {
      console.error(err);
      error = err;
    } finally {
      loading = false;
    }
  }

  async function selectConversation(phone: string) {
    selectedPhone = phone;
    messagesLoading = true;
    try {
      const fetched = await getMessages(phone, selectedSystemPhone ?? undefined);
      messages = fetched.reverse();
    } catch (err) {
      console.error(err);
      messages = [];
    } finally {
      messagesLoading = false;
    }
  }

  function goBack() {
    selectedPhone = null;
    messages = [];
  }
</script>

<div class="flex h-full">
  <!-- Conversation list sidebar -->
  <div
    class="w-full md:w-80 md:border-r md:border-base-300 shrink-0 {selectedPhone
      ? 'hidden md:flex md:flex-col'
      : 'flex flex-col'}"
  >
    {#if systemPhones.length > 1}
      <div class="p-3 border-b border-base-300">
        <select
          class="select select-sm w-full"
          value={selectedSystemPhone}
          onchange={(e) => selectSystemPhone((e.target as HTMLSelectElement).value)}
          aria-label="Select system phone number"
        >
          {#each systemPhones as phone}
            <option value={phone}>{formatPhoneNumber(phone)}</option>
          {/each}
        </select>
      </div>
    {/if}
    {#if loading}
      <div
        class="flex justify-center items-center py-12 flex-1"
        role="status"
        aria-label="Loading conversations"
      >
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:else if error}
      <div class="p-4">
        <div class="alert alert-error" role="alert">
          <ErrorIcon />
          <span>Something went wrong loading messages. Please try again later.</span>
        </div>
      </div>
    {:else if conversations.length === 0}
      <div class="text-center py-12 flex-1" role="status">
        <p class="text-base-content/60">No conversations yet.</p>
      </div>
    {:else}
      <ConversationList {conversations} {selectedPhone} onselect={selectConversation} />
    {/if}
  </div>

  <!-- Chat view -->
  <div class="flex-1 {selectedPhone ? 'flex flex-col' : 'hidden md:flex md:flex-col'}">
    {#if selectedPhone}
      {#if messagesLoading}
        <div
          class="flex justify-center items-center py-12 flex-1"
          role="status"
          aria-label="Loading messages"
        >
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else}
        <ConversationView {messages} contactPhone={selectedPhone} onback={goBack} />
      {/if}
    {:else}
      <div class="flex items-center justify-center flex-1 text-base-content/40">
        <p>Select a conversation</p>
      </div>
    {/if}
  </div>
</div>
```

---

### Task 6: Verify ConversationList.svelte needs no changes and run final checks

`ConversationList.svelte` requires no changes — the dropdown moved to `+page.svelte`. This task confirms everything compiles and tests pass before the final commit.

**Files:**
- No changes

- [ ] **Step 1: Run WebUI type check**

```bash
cd webui && bun check
```

Expected: no errors.

- [ ] **Step 2: Run WebUI tests**

```bash
cd webui && bun test:unit
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add webui/src/lib/api.ts \
        webui/src/routes/+page.svelte
git commit -m "feat: add system phone selector to conversation UI"
```
