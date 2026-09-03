const enabled = new Set(
  (import.meta.env?.VITE_FLAGS ?? "sync-v2,sync-batching").split(","),
);

export const flags = {
  isEnabled: (name: string): boolean => enabled.has(name),
};
