import type { NotesApiClient } from "./lib/notes-api";
import type { SmtpClient } from "./lib/smtp-client";

export type DigestDeps = {
  readonly notesApi: NotesApiClient;
  readonly smtpClient: SmtpClient;
  readonly now: () => Date;
};

export const sendWeeklyDigest = async (deps: DigestDeps, teamId: string): Promise<void> => {
  const notes = await deps.notesApi.listNotes(teamId);
  const since = deps.now().getTime() - 7 * 24 * 60 * 60 * 1000;
  const recent = notes.filter((n) => new Date(n.updated_at).getTime() > since);
  if (recent.length === 0) return;
  await deps.smtpClient.sendMail({
    from: "notes@example.com",
    to: `team-${teamId}@example.com`,
    subject: "Weekly notes",
    text: recent.map((n) => `- ${n.title}`).join("\n"),
  });
};
