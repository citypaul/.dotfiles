import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { MailApiClient } from "./lib/mail-api";
import type { NoteDto } from "./lib/notes-api";

type Created = Parameters<MailApiClient["messages"]["create"]>[0];
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
  const created: Created[] = [];
  const mailApi: MailApiClient = {
    messages: {
      create: async (input) => {
        created.push(input);
        return { id: "m1", accepted: true };
      },
    },
  };
  return {
    created,
    deps: {
      notesApi: {
        listNotes: async (teamId: string) =>
          notes.filter((n) => n.team_id === teamId),
      },
      mailApi,
      now: () => now,
    },
  };
};

describe("acceptance: weekly digest through the mail API", () => {
  it("sends one line per note updated in the last seven days", async () => {
    const fakes = createFakes([
      note({
        id: "a",
        title: "Plan offsite",
        updated_at: "2026-03-12T10:00:00Z",
      }),
      note({ id: "b", title: "Fix login", updated_at: "2026-03-09T10:00:00Z" }),
      note({ id: "c", title: "Old idea", updated_at: "2026-03-01T10:00:00Z" }),
    ]);
    const { router } = createApp(fakes.deps);

    const response = await router.handle({
      method: "POST",
      path: "/teams/t1/digest",
      params: {},
      body: null,
    });

    expect(response.status).toBe(202);
    expect(fakes.created).toEqual([
      {
        sender: "notes@example.com",
        recipients: ["team-t1@example.com"],
        subject: "Weekly notes",
        textBody: "- Plan offsite\n- Fix login",
      },
    ]);
  });

  it("sends nothing when no note was updated", async () => {
    const fakes = createFakes([
      note({ id: "c", updated_at: "2026-01-01T10:00:00Z" }),
    ]);
    const { router } = createApp(fakes.deps);

    await router.handle({
      method: "POST",
      path: "/teams/t1/digest",
      params: {},
      body: null,
    });

    expect(fakes.created).toEqual([]);
  });
});
