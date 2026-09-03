import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { NoteDto } from "./lib/notes-api";
import type { SmtpMessage } from "./lib/smtp-client";

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
  const sent: SmtpMessage[] = [];
  return {
    sent,
    deps: {
      notesApi: {
        listNotes: async (teamId: string) =>
          notes.filter((n) => n.team_id === teamId),
      },
      smtpClient: {
        sendMail: async (message: SmtpMessage) => {
          sent.push(message);
          return { messageId: "m" };
        },
      },
      now: () => now,
    },
  };
};

describe("acceptance: drafts never reach the digest", () => {
  it("leaves draft notes out of the email", async () => {
    const fakes = createFakes([
      note({ id: "a", title: "Plan offsite" }),
      note({ id: "b", title: "draft: budget" }),
      note({ id: "c", title: "DRAFT: hiring plan" }),
      note({ id: "d", title: "Fix login" }),
    ]);
    const { router } = createApp(fakes.deps);

    await router.handle({
      method: "POST",
      path: "/teams/t1/digest",
      params: {},
      body: null,
    });

    expect(fakes.sent.map((m) => m.text)).toEqual([
      "- Plan offsite\n- Fix login",
    ]);
  });

  it("sends nothing when every recent note is a draft", async () => {
    const fakes = createFakes([note({ id: "b", title: "draft: budget" })]);
    const { router } = createApp(fakes.deps);

    await router.handle({
      method: "POST",
      path: "/teams/t1/digest",
      params: {},
      body: null,
    });

    expect(fakes.sent).toEqual([]);
  });
});
