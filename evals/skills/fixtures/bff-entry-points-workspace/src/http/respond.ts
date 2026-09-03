export const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

export const problem = (
  status: number,
  title: string,
  headers: Readonly<Record<string, string>> = {},
): Response =>
  new Response(JSON.stringify({ title, status }), {
    status,
    headers: {
      "content-type": "application/problem+json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
