// Late fee schedule, daily percentage of the overdue balance. Runs nightly.

const RATES: Record<string, number> = {
  standard: 0.02,
  plus: 0.01,
  enterprise: 0,
};
const GRACE_DAYS = 3;
const CAP_PENCE = 5000;

export function lateFee(overduePence: number, daysOverdue: number, tier?: string): number {
  if (daysOverdue <= GRACE_DAYS) return 0;
  let rate = RATES[tier || "standard"];
  if (rate === undefined) rate = RATES["standard"]!;
  let fee = Math.round(overduePence * rate * daysOverdue);
  if (fee > CAP_PENCE) fee = CAP_PENCE;
  return fee;
}
