// Stand-in for a database pool SDK. We do not own this API shape.

export type QueryResult = {
  readonly rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
};

export type DbPool = {
  readonly query: (sql: string, params?: ReadonlyArray<unknown>) => Promise<QueryResult>;
  readonly end: () => Promise<void>;
};

export const createDbPool = ({ connectionString }: { connectionString: string }): DbPool => {
  const stored: Array<Record<string, unknown>> = [];

  return {
    query: async (sql, params = []) => {
      if (/^\s*insert/i.test(sql)) {
        stored.push({ id: params[0], email: params[1], expires_at: params[2], host: connectionString });
        return { rows: [] };
      }
      if (/^\s*select/i.test(sql)) {
        return { rows: stored.filter((row) => row["id"] === params[0]) };
      }
      if (/^\s*delete/i.test(sql)) {
        const cutoff = String(params[0] ?? "");
        const expired = stored.filter((row) => String(row["expires_at"] ?? "") < cutoff);
        expired.forEach((row) => stored.splice(stored.indexOf(row), 1));
        return { rows: expired };
      }
      return { rows: [] };
    },
    end: async () => {
      stored.length = 0;
    },
  };
};
