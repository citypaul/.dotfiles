export class Database {
  constructor(private readonly url: string) {}

  async query(
    sql: string,
    params: ReadonlyArray<string>,
  ): Promise<Array<Record<string, unknown>>> {
    const response = await fetch(`${this.url}/query`, {
      method: "POST",
      body: JSON.stringify({ sql, params }),
    });
    return (await response.json()) as Array<Record<string, unknown>>;
  }
}
