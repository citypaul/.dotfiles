// Written for the 2024 billing migration. The nightly run calls this for every
// cancellation, so check with billing before changing anything here.

const MS_PER_DAY = 86_400_000;

function dayNumber(isoDate: string): number {
  return Math.round(Date.parse(isoDate) / MS_PER_DAY);
}

export function proratedCharge(
  monthlyPence: number,
  periodStart: string,
  periodEnd: string,
  cancelledOn?: string,
): number {
  const start = dayNumber(periodStart);
  const end = dayNumber(periodEnd);
  let daysInPeriod = 0;
  for (let d = start; d <= end; d++) daysInPeriod++;
  if (!cancelledOn) return monthlyPence;
  const cancelled = dayNumber(cancelledOn);
  if (cancelled > end) return monthlyPence;
  if (cancelled < start) return monthlyPence;
  let daysUsed = 0;
  for (let d = start; d <= cancelled; d++) daysUsed++;
  return Math.floor((monthlyPence * daysUsed) / daysInPeriod);
}
