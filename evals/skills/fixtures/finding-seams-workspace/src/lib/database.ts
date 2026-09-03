// Stand-in for the Postgres driver we use in production. We do not own this
// API shape. Constructing one opens a connection to the server named by the
// connection string; here that connection is an in-process table per server.

export type ApiKeyRow = {
  readonly id: number;
  readonly account_id: string;
  readonly label: string;
  readonly issued_at: number;
  readonly expires_at: number;
  readonly revoked_at: number | null;
};

export type NewApiKeyRow = Omit<ApiKeyRow, "id">;

const servers = new Map<string, ApiKeyRow[]>();

export class Database {
  readonly #rows: ApiKeyRow[];

  constructor(connectionString: string) {
    if (!connectionString.startsWith("postgres://")) {
      throw new Error(`could not connect: invalid connection string "${connectionString}"`);
    }
    const rows = servers.get(connectionString) ?? [];
    servers.set(connectionString, rows);
    this.#rows = rows;
    process.stdout.write(`[db] connected to ${connectionString}\n`);
  }

  async apiKeysFor(accountId: string): Promise<ReadonlyArray<ApiKeyRow>> {
    return this.#rows.filter((row) => row.account_id === accountId).map((row) => ({ ...row }));
  }

  async insertApiKey(row: NewApiKeyRow): Promise<ApiKeyRow> {
    const inserted = { id: this.#rows.length + 1, ...row };
    this.#rows.push(inserted);
    return { ...inserted };
  }

  async revokeApiKey(id: number, revokedAt: number): Promise<boolean> {
    const index = this.#rows.findIndex((row) => row.id === id);
    const row = this.#rows[index];
    if (row === undefined || row.revoked_at !== null) return false;
    this.#rows[index] = { ...row, revoked_at: revokedAt };
    return true;
  }
}
