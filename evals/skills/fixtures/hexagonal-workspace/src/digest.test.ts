import { describe, expect, it, vi } from "vitest";
import { sendWeeklyDigest } from "./digest";

describe("sendWeeklyDigest", () => {
  it("calls sendMail with recent notes", async () => {
    const listNotes = vi.fn().mockResolvedValue([
      { id: "a", team_id: "t1", title: "Plan offsite", body: "", updated_at: "2026-03-12T10:00:00Z", reminder_at: null, device_token: null },
      { id: "b", team_id: "t1", title: "Old idea", body: "", updated_at: "2026-03-01T10:00:00Z", reminder_at: null, device_token: null },
    ]);
    const sendMail = vi.fn().mockResolvedValue({ messageId: "m" });

    await sendWeeklyDigest(
      { notesApi: { listNotes }, smtpClient: { sendMail }, now: () => new Date("2026-03-15T09:00:00Z") },
      "t1",
    );

    expect(listNotes).toHaveBeenCalledWith("t1");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0]?.[0]).toMatchObject({ to: "team-t1@example.com", text: "- Plan offsite" });
  });
});
