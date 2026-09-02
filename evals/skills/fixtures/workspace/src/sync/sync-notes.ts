import { flags } from "./flags";
import { RetryQueue } from "./retry-queue";
import { SyncCache } from "./sync-cache";
import { pushBatch } from "./transport";

const queue = new RetryQueue({ maxAttempts: 5, backoffMs: 500 });
const cache = new SyncCache();

export const syncNotes = async (
  notes: ReadonlyArray<{ id: string; updatedAt: string }>,
) => {
  if (!flags.isEnabled("sync-v2")) {
    return pushBatch(notes);
  }
  const dirty = notes.filter((n) => cache.isDirty(n.id, n.updatedAt));
  if (flags.isEnabled("sync-batching")) {
    queue.enqueue(() => pushBatch(dirty));
  } else {
    dirty.forEach((n) => queue.enqueue(() => pushBatch([n])));
  }
  if (flags.isEnabled("sync-legacy-fallback") && queue.failed > 0) {
    await pushBatch(notes);
  }
  await queue.drain();
  dirty.forEach((n) => cache.markClean(n.id));
};
