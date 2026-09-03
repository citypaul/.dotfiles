export const pushBatch = async (
  notes: ReadonlyArray<{ readonly id: string; readonly updatedAt: string }>,
): Promise<void> => {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) {
    throw new Error(`sync failed: ${response.status}`);
  }
};
