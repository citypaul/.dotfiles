// Stand-in for the notes HTTP API SDK. We do not own this API shape.

export type NoteDto = {
  readonly id: string;
  readonly team_id: string;
  readonly title: string;
  readonly body: string;
  readonly updated_at: string;
  readonly reminder_at: string | null;
  readonly device_token: string | null;
};

export type NotesApiConfig = {
  readonly baseUrl: string;
  readonly token: string;
};

export type NotesApiClient = {
  readonly listNotes: (teamId: string) => Promise<ReadonlyArray<NoteDto>>;
};

export const createNotesApiClient = (config: NotesApiConfig): NotesApiClient => ({
  listNotes: async (teamId) => {
    const response = await fetch(`${config.baseUrl}/teams/${teamId}/notes`, {
      headers: { authorization: `Bearer ${config.token}` },
    });
    return (await response.json()) as ReadonlyArray<NoteDto>;
  },
});
