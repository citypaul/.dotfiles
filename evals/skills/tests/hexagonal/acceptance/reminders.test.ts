import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { NoteDto } from "./lib/notes-api";
import type { PushMessage } from "./lib/push";

const now = new Date("2026-03-15T09:00:00Z");

const note = (overrides: Partial<NoteDto>): NoteDto => ({
  id: "n",
  team_id: "t1",
  title: "Title",
  body: "Body",
  updated_at: "2026-03-14T09:00:00Z",
  reminder_at: null,
  device_token: null,
  ...overrides,
});

const createFakes = (notes: ReadonlyArray<NoteDto>) => {
  const pushed: PushMessage[] = [];
  return {
    pushed,
    deps: {
      notesApi: {
        listNotes: async (teamId: string) =>
          notes.filter((n) => n.team_id === teamId),
      },
      smtpClient: { sendMail: async () => ({ messageId: "m" }) },
      push: {
        notify: async (message: PushMessage) => {
          pushed.push(message);
          return { delivered: true };
        },
      },
      now: () => now,
    },
  };
};

describe("acceptance: POST /reminders/run", () => {
  it("pushes notes whose reminder fell in the last fifteen minutes", async () => {
    const fakes = createFakes([
      note({
        id: "due",
        title: "Call plumber",
        body: "x".repeat(100),
        reminder_at: "2026-03-15T08:50:00Z",
        device_token: "dev-1",
      }),
      note({
        id: "too-old",
        title: "Old",
        reminder_at: "2026-03-15T08:40:00Z",
        device_token: "dev-2",
      }),
      note({
        id: "future",
        title: "Later",
        reminder_at: "2026-03-15T09:05:00Z",
        device_token: "dev-3",
      }),
      note({
        id: "no-device",
        title: "Nowhere",
        reminder_at: "2026-03-15T08:55:00Z",
        device_token: null,
      }),
      note({
        id: "other-team",
        team_id: "t2",
        title: "Theirs",
        reminder_at: "2026-03-15T08:55:00Z",
        device_token: "dev-4",
      }),
    ]);
    const { router } = createApp(fakes.deps);

    const response = await router.handle({
      method: "POST",
      path: "/reminders/run",
      params: {},
      body: { teamId: "t1" },
    });

    expect(response.status).toBe(202);
    expect(fakes.pushed).toEqual([
      { deviceToken: "dev-1", title: "Call plumber", body: "x".repeat(80) },
    ]);
  });

  it("pushes nothing when no reminder is due", async () => {
    const fakes = createFakes([
      note({ id: "a", reminder_at: null, device_token: "dev-1" }),
    ]);
    const { router } = createApp(fakes.deps);

    const response = await router.handle({
      method: "POST",
      path: "/reminders/run",
      params: {},
      body: { teamId: "t1" },
    });

    expect(response.status).toBe(202);
    expect(fakes.pushed).toEqual([]);
  });
});
