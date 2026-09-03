import { Database } from "./database";
import { sendEmail } from "./mailer";

export class WeeklyReport {
  private readonly db = new Database(process.env.DATABASE_URL ?? "");

  async send(teamId: string): Promise<void> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const notes = await this.db.query(
      "select * from notes where team_id = $1 and updated_at > $2",
      [teamId, since.toISOString()],
    );
    const body = notes.map((n: { title: string }) => `- ${n.title}`).join("\n");
    await sendEmail({
      to: `team-${teamId}@example.com`,
      subject: "Weekly notes",
      body,
    });
  }
}
