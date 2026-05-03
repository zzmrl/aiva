import { mock } from "bun:test";

mock.module("../app/config", () => ({
  default: {
    NODE_ENV: "test",
    PORT: 3000,
    PUBLIC_HOST: "test.example.com",
    VENICE_API_KEY: "test-key",
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
  },
}));

mock.module("../app/shared/database/client", () => ({
  default: mock(async () => []),
}));

mock.module("../app/shared/queue", () => ({
  default: { send: mock(() => Promise.resolve("job-id")) },
}));

mock.module("../app/modules/llm/client", () => ({
  default: {},
}));

mock.module("../app/modules/llm/completions", () => ({
  voiceCompletion: {
    create: mock(() => Promise.resolve("")),
    stream: mock(async function* () {}),
  },
  smsCompletion: {
    create: mock(async () => "Mocked text response"),
    stream: mock(async function* () {}),
  },
  defineCompletion: mock(() => ({
    create: mock(() => Promise.resolve("")),
    stream: mock(async function* () {}),
  })),
}));

mock.module("../app/modules/twilio/client", () => ({
  default: { messages: { create: mock() } },
}));
