export class SyncCache {
  private readonly lastSynced = new Map<string, string>();

  isDirty(id: string, updatedAt: string): boolean {
    return this.lastSynced.get(id) !== updatedAt;
  }

  markClean(id: string): void {
    this.lastSynced.set(id, new Date().toISOString());
  }
}
