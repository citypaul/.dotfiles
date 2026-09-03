export const formatPence = (pence: number): string => {
  const sign = pence < 0 ? "-" : "";
  const absolute = Math.abs(pence);
  const pounds = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const remainder = String(absolute % 100).padStart(2, "0");
  return `${sign}£${pounds}.${remainder}`;
};
