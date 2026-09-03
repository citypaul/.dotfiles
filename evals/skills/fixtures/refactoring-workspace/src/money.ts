const PENCE_PER_POUND = 100;

export const formatPence = (pence: number): string => {
  const sign = pence < 0 ? "-" : "";
  const magnitude = Math.abs(pence);
  const pounds = Math.floor(magnitude / PENCE_PER_POUND);
  const remainder = String(magnitude % PENCE_PER_POUND).padStart(2, "0");
  return `${sign}£${pounds}.${remainder}`;
};

export const parsePounds = (text: string): number | undefined => {
  const match = /^£?(\d+)(?:\.(\d{2}))?$/.exec(text.trim());
  if (!match) return undefined;
  const pounds = Number(match[1]);
  const pence = Number(match[2] ?? "0");
  return pounds * PENCE_PER_POUND + pence;
};
